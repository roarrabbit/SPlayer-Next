<div align="center">

<img alt="SPlayer-Next logo" width="120" height="120" src="public/icons/favicon.png" />

# SPlayer-Next (Fork)

🎵 跨平台桌面音乐播放器 —— 在上游基础上重新打磨的独立版本

[![Release](https://img.shields.io/github/v/release/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/releases)
[![License](https://img.shields.io/github/license/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/blob/main/LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-SPlayer--Next-blue)](https://github.com/SPlayer-Dev/SPlayer-Next)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

</div>

> [!IMPORTANT]
> 本项目是 [SPlayer-Dev/SPlayer-Next](https://github.com/SPlayer-Dev/SPlayer-Next) 的 **Fork 版本**，由 [roarrabbit](https://github.com/roarrabbit) 独立维护。
> 它不是上游的镜像，而是带有自己独特功能与交互设计的分支版本，与上游独立演进。

## ✨ 这个 Fork 有什么不同

在上游完整功能之上，本版本带来了以下专属改进：

### 🏝️ 灵动岛播放

类 iPhone 灵动岛的桌面悬浮播放器：封面、歌词、频谱随音乐流动呈现，液体动效贴合 macOS 质感。

<p align="center">
  <img src="docs/public/dynamic-island.gif" alt="灵动岛播放器演示" width="520" />
</p>
### 🌊 流体动效

GLSL 流体背景升级为 fbm / domain-warp 网格扭曲，支持随音乐律动的节拍脉动，强度与平滑均可调。

<p align="center">
  <img src="docs/public/player-page.gif" alt="灵动岛播放器演示" width="520" />
</p>

### 🍎 macOS 适配

针对 macOS 完成系统性适配：窗口行为、媒体控制、原生交互细节全面对齐平台习惯。

### 🔓 音乐解锁

内置音乐解锁能力，配合插件系统为不可直接播放的曲目匹配可用音源。

### 🎛️ 按键布局优化

重新梳理播放页与全局的按键布局及交互逻辑，常用操作更顺手、层级更清晰。

## 🎼 上游核心功能

- 🎵 广泛格式支持（MP3 / FLAC / WAV / AAC / OGG / APE…），FFmpeg + Rust 高性能解码
- 📝 丰富歌词：LRC / QRC / YRC / TTML，逐字高亮、翻译，支持桌面歌词 / 灵动岛 / 任务栏歌词
- 🌐 流媒体：Subsonic / Navidrome / Jellyfin / Emby 多服务器管理
- 🖥️ Windows / macOS / Linux 跨平台 + SMTC / MPRIS / Now Playing / Discord RPC
- 🎚️ 实时 FFT 音乐频谱、🏷️ 元信息编辑、⬇️ 下载管理、📈 Last.fm Scrobble
- 🧩 插件系统：本地 / URL 安装音源与控制插件，可复制安装链接分享
- 🎨 封面取色自适应主题，Light / Dark / Auto

更多细节见上游仓库与 [使用指南](docs/guide.md)、[插件使用](docs/plugins-usage.md)。

## 🚀 快速开始

前往 [Releases](https://github.com/roarrabbit/SPlayer-Next/releases) 下载对应平台的安装包。

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

环境要求见 [贡献指南](docs/contributing.md)，原生模块说明见 [原生模块](docs/native.md)。

## 📋 更新日志

### 1.0.2

- **灵动岛升级**：频谱算法重构为 RMS 能量 + 对数频率分桶 + 感知动态压缩 + 非对称 attack/release 包络，视觉更顺滑真实；新增**歌词显示开关**（showLyric）；频谱颜色随封面自动提亮
- **大播放器流体背景**：GLSL 着色器升级为 fbm / domain-warp 网格扭曲，新增节拍脉动 uniform（`u_beatPulse`）并以 60fps 驱动，随音乐律动更明显
- **大播放器界面**：按键布局与交互细节打磨（已与迭代版本对齐）

### 1.0.1

- 全屏播放页：退出与歌词按钮对调；下滑关闭（velocity + interruptible spring）；Esc 应用内关闭
- 快捷键：默认全局绑定全部清空，交由用户选择；关闭播放页默认应用内 `Esc`
- 交互动效：统一 ease-out / sheet 曲线，减少 ease-in 与过慢离场
- 插件：修复了插件并增加支持复制**安装链接**（安装时使用的 URL）便于分享；完善沙箱兼容，降低 LX 类脚本崩溃
- 歌单列表：修改单击播放逻辑，设置项增加**列表单击行为**——接续列表或仅当前曲（双击为相反行为）
- 网易云：完善显示，`fee=8` 不再显示为 VIP 标签
- 流体背景：节拍脉动更顺滑；在背景跳动下增加**跳动强度** / **跳动平滑**

## 🙏 致谢

感谢上游 [SPlayer-Next](https://github.com/SPlayer-Dev/SPlayer-Next) 作者 **imsyy** 及所有贡献者。

特别感谢以下开源项目：

- [applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) —— 类 Apple Music 歌词显示组件库
- [NeteaseCloudMusicApiEnhanced](https://github.com/neteasecloudmusicapienhanced/api-enhanced) —— 网易云音乐 API 备份 + 增强

## 📄 开源许可

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 许可开源。

- **修改与分发：** 任何修改或分发都必须同样基于 **AGPL-3.0**，并一并提供完整源代码。
- **派生作品：** 必须同样采用 **AGPL-3.0**，并在适当位置保留本项目的许可与版权信息。
- **署名：** 必须保留原作者及版权信息。可为二次开发添加你自己的署名，但不得移除或篡改原始信息。
- **商业用途：** 如用于售卖或其他盈利用途，必须提供源代码及原项目链接。由于本项目涉及第三方服务，商业使用可能存在法律风险。
- **免责：** 本软件按「现状」提供，不附带任何形式的担保，详见 AGPL-3.0。

## ⚠️ 免责声明

本项目仅供个人学习与研究使用，禁止用于商业及非法用途。部分功能依赖第三方 API，使用者须自行确保其使用符合相关法律法规及服务协议。对于因使用本项目而产生的任何直接或间接后果，作者与二次开发者不承担任何责任。
