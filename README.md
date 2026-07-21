<div align="center">

<img alt="SPlayer-Next logo" width="120" height="120" src="public/icons/favicon.png" />

<h2>SPlayer-Next Fork</h2>

<p>🎵 跨平台桌面音乐播放器，支持丰富的歌词展现形式与广泛的音频格式</p>

<p>
  本仓库是
  「<a href="https://github.com/SPlayer-Dev/SPlayer">SPlayer</a>」继任版
  「<a href="https://github.com/SPlayer-Dev/SPlayer-Next">SPlayer-Next</a>」
  的 <strong>Fork</strong>，由
  <a href="https://github.com/roarrabbit">roarrabbit</a>
  进行二次开发与维护。
</p>

[![Stars](https://img.shields.io/github/stars/roarrabbit/SPlayer-Next?style=flat)](https://github.com/roarrabbit/SPlayer-Next/stargazers)
[![Release](https://img.shields.io/github/v/release/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/releases)
[![License](https://img.shields.io/github/license/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/blob/main/LICENSE)
[![Issues](https://img.shields.io/github/issues/roarrabbit/SPlayer-Next)](https://github.com/roarrabbit/SPlayer-Next/issues)
[![Upstream](https://img.shields.io/badge/upstream-SPlayer--Next-blue)](https://github.com/SPlayer-Dev/SPlayer-Next)

</div>

---

## 关于本 Fork

| 角色 | 账号 |
| --- | --- |
| Author（上游作者） | [imsyy](https://github.com/imsyy) / [SPlayer-Dev](https://github.com/SPlayer-Dev) |
| Secondary Developer（二次开发） | [roarrabbit](https://github.com/roarrabbit) |

- **本仓库**：<https://github.com/roarrabbit/SPlayer-Next>
- **上游仓库**：<https://github.com/SPlayer-Dev/SPlayer-Next>
- 应用内 **设置 → 关于软件** 展示名为 **SPlayer-Next Fork**，开发人员列表中二次开发者固定排在 Author 之后。

## 功能特性

- 🎵 **广泛的格式支持** —— MP3、FLAC、WAV、AAC、OGG、APE 等，基于 FFmpeg 解码
- 📝 **丰富的歌词** —— LRC / QRC / YRC / TTML，逐字高亮与翻译，支持桌面、灵动岛、任务栏歌词窗口
- 🌐 **流媒体服务** —— Subsonic / Navidrome / Jellyfin / Emby（多服务器、自动连接）
- 🖥️ **跨平台** —— Windows / macOS / Linux
- 🎚️ **音乐频谱** —— 实时 FFT 可视化
- 🏷️ **元信息编辑** —— 编辑本地曲目标签与封面
- ⬇️ **下载** —— 内置下载管理器
- 🎧 **系统媒体集成** —— Windows SMTC / Linux MPRIS / macOS Now Playing + Discord RPC
- ⚡ **高性能音频引擎** —— FFmpeg + Rust
- 🎨 **自适应主题** —— 基于封面取色，Light / Dark / Auto
- 📈 **Last.fm Scrobble**
- 🧩 **插件系统** —— 本地 / URL 安装音源与控制插件，可复制安装链接分享
- 🌊 **流体播放背景** —— 封面网格流体动画，可选节拍脉动（强度与平滑可调）

### Fork 交互增强

- **全屏播放页**：左上角退出 / 左下角歌词开关；支持**下滑手势关闭**（跟手 + 速度判断 + 可打断弹簧）
- **Esc 关闭播放页**：应用内快捷键（非全局）；与退出按钮同一套收起动画
- **全局快捷键默认关闭**：出厂不占用系统级快捷键，由用户在 **设置 → 快捷键** 自行绑定
- **动效与反馈**：弹层 / 抽屉 / Toast / 按压反馈等统一为更轻的 ease-out 与 sheet 曲线

## 开发

```bash
# 克隆本 Fork
git clone https://github.com/roarrabbit/SPlayer-Next.git
cd SPlayer-Next

# 安装依赖
pnpm install

# 开发（debug 构建原生模块 + Electron）
pnpm dev

# 仅界面开发可跳过 Rust
SKIP_NATIVE_BUILD=true pnpm dev

# 类型检查 / 完整构建
pnpm typecheck
pnpm build
```

环境要求与约定见 [贡献指南](docs/contributing.md)；原生模块见 [原生模块](docs/native.md)。上游开发文档亦可参考：<https://github.com/SPlayer-Dev/SPlayer-Next>

## 使用提示

- **退出全屏播放**：点击左上角下箭头，或按 **Esc**（应用内），或**下滑**面板
- **全局快捷键**：默认未绑定；在设置中按需开启并配置
- **应用内关闭播放页**：默认 `Esc`（可在快捷键设置中修改）

更多见 [使用指南](docs/guide.md)。

## 更新日志

### 1.0.1-fork

- 关于页：展示 **SPlayer-Next Fork**；开发人员增加 Secondary Developer（roarrabbit）
- 设置底部 / 社区入口指向本 Fork 仓库
- 全屏播放页：退出与歌词按钮对调；下滑关闭（velocity + interruptible spring）；Esc 应用内关闭
- 快捷键：默认全局绑定全部清空，交由用户选择；关闭播放页默认应用内 `Esc`
- 交互动效：统一 ease-out / sheet 曲线，减少 ease-in 与过慢离场

### 1.0.1

- 插件：修复了插件并增加支持复制**安装链接**（安装时使用的 URL）便于分享；完善沙箱兼容，降低 LX 类脚本崩溃
- 歌单列表：修改单击播放逻辑，设置项增加**列表单击行为**——接续列表或仅当前曲（双击为相反行为）
- 网易云：完善显示，`fee=8` 不再显示为 VIP 标签
- 流体背景：节拍脉动更顺滑；在背景跳动下增加**跳动强度** / **跳动平滑**

## 致谢

感谢上游 [SPlayer-Next](https://github.com/SPlayer-Dev/SPlayer-Next) 作者 **imsyy** 及所有贡献者。

特别感谢以下开源项目：

- [applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) —— 类 Apple Music 歌词显示组件库
- [NeteaseCloudMusicApiEnhanced](https://github.com/neteasecloudmusicapienhanced/api-enhanced) —— 网易云音乐 API 备份 + 增强

## 开源许可

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) 许可开源。

- **修改与分发：** 任何修改或分发都必须同样基于 **AGPL-3.0**，并一并提供完整源代码。
- **派生作品：** 必须同样采用 **AGPL-3.0**，并在适当位置保留本项目的许可与版权信息。
- **署名：** 必须保留原作者及版权信息。可为二次开发添加你自己的署名，但不得移除或篡改原始信息。
- **商业用途：** 如用于售卖或其他盈利用途，必须提供源代码及原项目链接。由于本项目涉及第三方服务，商业使用可能存在法律风险。
- **免责：** 本软件按「现状」提供，不附带任何形式的担保，详见 AGPL-3.0。

## 免责声明

本项目仅供个人学习与研究使用，禁止用于商业及非法用途。部分功能依赖第三方 API，使用者须自行确保其使用符合相关法律法规及服务协议。对于因使用本项目而产生的任何直接或间接后果，作者与二次开发者不承担任何责任。
