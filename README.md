# splayer-next

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ pnpm install
```

### FFmpeg (Native Build)

`audio-engine` uses FFmpeg static linking.

Do this **before** `pnpm dev`:

1) Get FFmpeg static libs:
- Windows: download `ffmpeg-<version>-windows-x64.zip`
- macOS: download `ffmpeg-<version>-macos-arm64.tar.gz` or `ffmpeg-<version>-macos-x64.tar.gz`
- Linux: download `ffmpeg-<version>-linux-x64.tar.gz`

Unpack to a local directory (for example: `D:\ffmpeg` or `/path/to/ffmpeg`), and ensure it contains `include` and `lib`.

2) Set:
- `FFMPEG_DIR`
- `PKG_CONFIG_PATH`

Windows (PowerShell):
```powershell
$env:FFMPEG_DIR="D:\ffmpeg"
$env:PKG_CONFIG_PATH="$env:FFMPEG_DIR\lib\pkgconfig"
pnpm build:native
```

macOS / Linux (bash):
```bash
export FFMPEG_DIR=/path/to/ffmpeg
export PKG_CONFIG_PATH="$FFMPEG_DIR/lib/pkgconfig"
pnpm build:native
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
