<div align="center">

<img alt="SPlayer-Next logo" width="120" height="120" src="public/icons/favicon.png" />

# SPlayer-Next (Fork)

🎵 桌面音乐播放器 —— 基于官方 v1.1.0 重新打磨的独立版本（v1.1.0-fork）

[![Release](https://img.shields.io/github/v/release/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/releases)
[![Version](https://img.shields.io/badge/version-v1.1.0--fork-9cf)]()
[![License](https://img.shields.io/github/license/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/blob/dev/LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-SPlayer--Next-blue)](https://github.com/SPlayer-Dev/SPlayer-Next)
[![Platform](https://img.shields.io/badge/platform-macOS-9cf)]()

</div>

> [!IMPORTANT]
> 本项目是 [SPlayer-Dev/SPlayer-Next](https://github.com/SPlayer-Dev/SPlayer-Next) 的 **Fork 版本**，由 [roarrabbit](https://github.com/roarrabbit) 独立维护。
> 它不是上游的镜像，而是带有自己独特功能与交互设计的分支版本，与上游独立演进。

> [!WARNING]
> 本 Fork **仅针对 macOS 适配**（含灵动岛、媒体控制、窗口行为等系统级集成）。
> Windows / Linux 平台未做适配，任务栏歌词、SMTC / MPRIS 等平台特性无法保证可用，体验不佳。

## ✨ 这个 Fork 有什么不同

在上游完整功能之上，本版本带来了以下专属改进：

### 🏝️ 灵动岛播放

适配macOS灵动岛的桌面悬浮播放器：封面、歌词、频谱随音乐流动呈现，液体动效贴合 macOS 质感，可设置显示歌词。

<p align="center">
  <img src="docs/public/dynamic-island-noLyric.gif" alt="灵动岛播放器演示" width="520" />
</p>


<p align="center">
  <img src="docs/public/dynamic-island-withLyric.gif" alt="灵动岛播放器演示" width="520" />
</p>


### 🌊 流体动效

流体背景优化节拍脉动更顺滑：支持随音乐律动的节拍脉动，强度与平滑均可调。

<p align="center">
  <img src="docs/public/splayer-page.gif" alt="灵动岛播放器演示" width="520" />
</p>


### 🍖 音乐插件

优化旧版本内置音乐插件与沙盒，配合插件系统匹配食用音源。

> [!NOTE]
> **音源歌单支持说明（当前版本）**
> - **WY**：完整支持在线歌单（加载、管理与播放）
> - **QM** / **KG**：目前仅支持**本地存储**（即本机已有的歌曲 / 缓存），暂不支持在线歌单

### 🎛️ 按键布局优化

重新梳理播放页与全局的按键布局及交互逻辑，常用操作更顺手、层级更清晰。

## 🎼 上游核心功能

- 🎵 广泛格式支持（MP3 / FLAC / WAV / AAC / OGG / APE…），FFmpeg + Rust 高性能解码
- 📝 丰富歌词：LRC / QRC / YRC / TTML，逐字高亮、翻译，支持桌面歌词 / 灵动岛 / 任务栏歌词
- 🌐 流媒体：Subsonic / Navidrome / Jellyfin / Emby 多服务器管理
- 🖥️ 上游为 Windows / macOS / Linux 跨平台（SMTC / MPRIS / Now Playing / Discord RPC）；**本 Fork 仅适配 macOS**，其余平台可能会有bug
- 🎚️ 实时 FFT 音乐频谱、🏷️ 元信息编辑、⬇️ 下载管理、📈 Last.fm Scrobble
- 🧩 插件系统：本地 / URL 安装音源与控制插件，可复制安装链接分享
- 🎨 封面取色自适应主题，Light / Dark / Auto

更多细节见上游仓库与 [使用指南](docs/guide.md)、[插件使用](docs/plugins-usage.md)。

## 🚀 快速开始

前往 [Releases](https://github.com/roarrabbit/SPlayer-Next/releases) 下载 macOS 安装包。

### 开发构建

```bash
git clone https://github.com/roarrabbit/SPlayer-Next.git
cd SPlayer-Next

pnpm install        # 安装依赖
pnpm dev            # debug 构建原生模块 + 启动 Electron

SKIP_NATIVE_BUILD=true pnpm dev   # 仅界面开发可跳过 Rust

pnpm typecheck      # 类型检查
pnpm build          # 完整构建
```

环境要求见 [贡献指南](docs/contributing.md)，原生模块见 [原生模块](docs/native.md)。

## 📋 更新日志

### v1.1.0-fork

- 由于官方更新了多源搜索所以决定带着fork的独立功能额外迁移更新，保留了原有内容的同时增加了一些喜欢的体验功能点
- **基座升级**：迁移至官方 SPlayer-Next v1.1.0，官方新特性与修复随基座一并带入（歌词页面隐藏恢复校准、侧边栏自定义重构、播放来源展示/预加载下一曲等新设置项、错误码补全等）
- **版本与渠道**：版本号调整为 v1.1.0-fork；发布与自动更新渠道切换至本仓库（roarrabbit/SPlayer-Next）

---

### 1.0.3

- **灵动岛打磨**
  - 频谱渲染重构：平滑渲染动效（上升快、回落缓），消除瞬态高跳的剧烈闪烁
  - 歌词统一封面主色渐变，修复间奏点左缘被裁切
  - 切歌与暂停行为修复：自动切歌不再闪收闪弹，暂停时可正常收起灵动岛
- **播放页面暂停背景缓停**：新增「窗口失焦时自动暂停流体背景」开关（默认开启），背景与节拍脉动随失焦平滑渐停、回焦自动恢复；修复失焦冻结态下切歌不变色
- **更新与修复**：网络超时给出中文友好提示，更新了部分上游代码。

### 1.0.2

- **灵动岛重构**：适配macOS的灵动岛，在灵动岛两侧放专辑与音乐频谱，下方放置歌词；新增**歌词显示开关**（showLyric）；频谱颜色随封面自动提亮
- **大播放器流体背景**：着色器优化，随音乐律动更明显
- **大播放器界面**：按键布局与交互细节打磨

### 1.0.1

- **全屏播放页**：按钮布局调整；设置Esc 大播放页关闭
- **快捷键**：默认全局绑定全部清空，交由用户选择
- **交互动效**：统一曲线，减少过慢离场
- **插件功能优化**：修复了插件功能并增加支持复制安装链接便于分享；完善沙箱兼容，降低 LX 类脚本崩溃
- **歌单列表**：修改单击播放逻辑，设置项增加列表单击行为——接续列表或仅当前曲（双击为相反行为）
- **完善显示**：`fee=8` 不再显示为标签
- **流体背景**：优化节拍脉动更顺滑；在背景跳动下增加跳动强度 / 跳动平滑

## 🙏 致谢

感谢上游 [SPlayer-Next](https://github.com/SPlayer-Dev/SPlayer-Next) 作者 **imsyy** 及所有贡献者。

特别感谢以下开源项目：

- [applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) —— 类 Apple Music 歌词显示组件库
- [NeteaseCloudMusicApiEnhanced](https://github.com/neteasecloudmusicapienhanced/api-enhanced) —— 在线音乐 API 备份 + 增强

## 📄 开源许可

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 许可开源。

- **修改与分发：** 任何修改或分发都必须同样基于 **AGPL-3.0**，并一并提供完整源代码。
- **派生作品：** 必须同样采用 **AGPL-3.0**，并在适当位置保留本项目的许可与版权信息。
- **署名：** 必须保留原作者及版权信息。可为二次开发添加你自己的署名，但不得移除或篡改原始信息。
- **商业用途：** 如用于售卖或其他盈利用途，必须提供源代码及原项目链接。由于本项目涉及第三方服务，商业使用可能存在法律风险。
- **免责：** 本软件按「现状」提供，不附带任何形式的担保，详见 AGPL-3.0。

## ⚠️ 免责声明

本项目仅供个人学习与研究使用，禁止用于商业及非法用途。部分功能依赖第三方 API，使用者须自行确保其使用符合相关法律法规及服务协议。对于因使用本项目而产生的任何直接或间接后果，作者与二次开发者不承担任何责任。
