# Apple Music 流体背景补丁测试证据

## 来源

计划：[2026-08-18-apple-music-fluid-background.md](../superpowers/plans/2026-08-18-apple-music-fluid-background.md)。实际生产目标是 `/Applications/SPlayer-Next.app/Contents/Resources/app.asar`；此目录中的工程源码未用于构建或部署。

## 用户旅程

- 用户播放低频明显的曲目时，单个低频上升沿只产生一次短促、局部的背景跳动。
- 用户处于持续 Bass 段落时，背景不会因持续能量反复触发或逐步加速。
- 用户看到的背景保持缓慢恒定的底流，且不会在鼓点时全屏缩放或明显变暗。

## RED / GREEN 证据

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| RED：脉冲模块不存在 | `node --test /private/tmp/splayer-fluid-patch/test/fluidBeatPulse.test.mjs` | `ERR_MODULE_NOT_FOUND`，只缺少 `fluidBeatPulse-CODEX.js` |
| GREEN：状态机 | 同上 | 3/3 通过 |
| RED：主布局未接入 | 同上 | 主布局缺少 `fluidBeatPulse-CODEX` 断言失败 |
| GREEN：接入完成 | 同上 | 4/4 通过 |
| RED：旧 shader 参数 | 同上 | `WARP_SPEED = 0.65` 断言失败，确认当前仍为旧值 |
| GREEN：新 shader | 同上 | 5/5 通过 |

## 保证项

| # | 保证 | 测试 | 类型 | 结果 |
| --- | --- | --- | --- | --- |
| 1 | 上升沿只触发一次短促脉冲 | `上升沿只触发一次短促低频脉冲` | 单元 | PASS |
| 2 | 持续能量不反复触发且会衰减 | `连续低频能量不会反复触发，脉冲会归零` | 单元 | PASS |
| 3 | 150ms 冷却期间不会二次跳动 | `短于冷却时间的第二次上升沿不会二次跳动` | 单元 | PASS |
| 4 | 主布局导入并传递独立 pulse uniform | `主布局将独立的 beatPulse 传给 shader` | 静态集成 | PASS |
| 5 | shader 使用慢速底流、局部窗口和收敛后的亮度映射 | `shader 保持恒速底流并将节拍限制在局部窗口` | 静态集成 | PASS |

## 覆盖率与部署验证

`node --test --experimental-test-coverage /private/tmp/splayer-fluid-patch/test/fluidBeatPulse.test.mjs`：5/5 通过；`fluidBeatPulse-CODEX.js` 行覆盖率 100%，分支覆盖率 90%，函数覆盖率 100%。

## 脉冲幅度调整

用户试听后反馈脉冲不明显。对实际链路的量化显示：原始局部强度 `0.055` 在强上升沿仅移动约 `0.78` 个 32×32 主色纹素，普通上升沿不足半个纹素。新增 `强鼓点在主色纹理上至少产生两个纹素的局部位移` 测试先以 `0.78` 失败；将 `BEAT_DISTORTION` 单独调整为 `0.16` 后，理论位移为约 `2.27` 个纹素，6/6 测试通过。此调整未改变基础流速、旋转、全局缩放、锚点或脉冲门控。

最终部署后的 `app.asar` SHA-256 为 `72d371e9e2f143d207254b9ebdf6925973054173176070a411f2945c769c8b27`，与已验证的临时封包一致。`codesign --verify --deep --strict --verbose=2 /Applications/SPlayer-Next.app` 通过。

## 脉冲平滑度修复

卡顿的根因是背景 FPS 设置默认值为 30，而脉冲 attack 为 18ms：绘制间隔约 33ms，快于脉冲上升，导致颜色位置逐帧跳变。新增 `脉冲活跃时以至少 60 FPS 重绘，静止时仍遵守用户帧率` 测试先失败，再以单一改动使 `beatPulse > 0.01` 时将渲染帧率提升到 `max(用户设置, 60)`。静止和常态流动仍使用用户的原设置，避免全程双倍 GPU 占用。7/7 测试通过。

最终部署后的 `app.asar` SHA-256 为 `29fe58b69bccbb9f0c11dd0c34dacff587d6cd83c5bc42d7bb2d6d7d9da23de7`，与已验证的临时封包一致；签名校验通过。

视觉和听感仍需在已重启的真实应用中用低频清晰的曲目完成最终验收；这是自动化测试无法覆盖的部分。
