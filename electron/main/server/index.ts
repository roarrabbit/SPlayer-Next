/**
 * 外部 API 服务器：HTTP (Hono) + WebSocket
 */

import type { Server } from "node:http";
import { Hono } from "hono";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { store } from "@main/store";
import { serverLog } from "@main/utils/logger";
import type { ExternalApiStatus } from "@shared/types/settings";
import { externalControlGate, wsGate } from "./gate";
import { buildRoutes } from "./routes";
import { wsHandlers } from "./ws";

let runningServer: Server | null = null;
let runningWss: WebSocketServer | null = null;
let runningPort: number | null = null;
let lastError: { code: string; message: string } | null = null;

export const getServerStatus = (): ExternalApiStatus => ({
  listening: runningServer !== null,
  port: runningPort,
  error: lastError,
});

/** 启动外部 API 服务 */
export const startServer = (): Promise<ExternalApiStatus> => {
  return new Promise((resolve) => {
    if (runningServer) {
      resolve(getServerStatus());
      return;
    }

    const port = store.get("externalApi.port");
    const hostname = "0.0.0.0";

    const app = new Hono();
    app.use("/api/*", externalControlGate);
    app.route("/api", buildRoutes());
    app.get(
      "/ws",
      externalControlGate,
      wsGate,
      upgradeWebSocket(() => wsHandlers),
    );
    app.get("/", (c) => c.text("SPlayer Next external API"));

    const wss = new WebSocketServer({ noServer: true });
    let settled = false;

    const server = serve({
      fetch: app.fetch,
      port,
      hostname,
      websocket: { server: wss },
    }) as Server;

    // error / listening 互斥：先到先 settle
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      const error = { code: err.code ?? "UNKNOWN", message: err.message };
      serverLog.error(`外部 API 监听 ${port} 失败 (${error.code}): ${error.message}`);
      wss.close();
      try {
        server.close();
      } catch {
        // server.close 在 listen 失败的情况下可能抛 ERR_SERVER_NOT_RUNNING，忽略
      }
      runningServer = null;
      runningWss = null;
      runningPort = null;
      lastError = error;
      resolve(getServerStatus());
    });

    server.once("listening", () => {
      if (settled) return;
      settled = true;
      runningServer = server;
      runningWss = wss;
      runningPort = port;
      lastError = null;
      serverLog.info(`外部 API 已启动: http://${hostname}:${port}`);
      resolve(getServerStatus());
    });
  });
};

/** 停止外部 API 服务 */
export const stopServer = (): Promise<void> => {
  if (!runningServer) return Promise.resolve();
  const server = runningServer;
  const wss = runningWss;
  runningServer = null;
  runningWss = null;
  runningPort = null;
  return new Promise((resolve) => {
    wss?.close();
    server.close((err) => {
      if (err) serverLog.warn("外部 API 关闭异常:", err);
      else serverLog.info("外部 API 已关闭");
      resolve();
    });
  });
};

/** 配置变更后重启服务 */
export const restartServer = async (): Promise<ExternalApiStatus> => {
  await stopServer();
  return startServer();
};
