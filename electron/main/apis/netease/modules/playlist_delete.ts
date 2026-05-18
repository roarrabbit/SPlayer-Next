/**
 * 删除歌单
 *
 * params:
 * - id  歌单 id（单个）
 *
 * 走 eapi /playlist/remove，data 字段是 `pid`（NCM 现行实现）
 * 响应：`{ code }`
 */

import { createOption } from "../core/option";
import type { NeteaseModule } from "../core/types";

const playlistDelete: NeteaseModule = (query, request) => {
  const data = { pid: query.id };
  return request("/api/playlist/remove", data, createOption(query, "eapi"));
};

export default playlistDelete;
