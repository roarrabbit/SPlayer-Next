/**
 * 歌单增/删歌曲
 *
 * params:
 * - op      "add" 或 "del"
 * - pid     歌单 id
 * - tracks  曲目 id 列表（逗号分隔字符串，由 wrapper 拼好）
 *
 * 响应：`{ code, count, trackIds, cloudCount }`
 */

import { createOption } from "../core/option";
import type { NeteaseModule } from "../core/types";

const playlistTracks: NeteaseModule = (query, request) => {
  const data = {
    op: query.op,
    pid: query.pid,
    trackIds: `[${query.tracks}]`,
    imme: "true",
  };
  return request("/api/playlist/manipulate/tracks", data, createOption(query, "weapi"));
};

export default playlistTracks;
