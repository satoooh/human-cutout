# human-cutout

画像・動画から人物の背景をAIで除去し、透過画像・動画を生成するCLIツール。

## 必須要件

- **Node.js** >= 18
- **FFmpeg** - 動画処理に必要

## インストール & 実行

```bash
# GitHubから直接実行（インストール不要）
npx github:satoooh/human-cutout -i ./input -o ./output
```

## 使い方

```bash
# 基本: input/ フォルダ内のファイルを一括処理
npx github:satoooh/human-cutout

# 単一ファイルを処理
npx github:satoooh/human-cutout -i photo.jpg
npx github:satoooh/human-cutout -i video.mp4

# 入出力フォルダを指定
npx github:satoooh/human-cutout -i ./my_files -o ./results

# 動画の出力形式を指定（デフォルト: webm）
npx github:satoooh/human-cutout -i video.mp4 -f mov   # ProRes 4444
npx github:satoooh/human-cutout -i video.mp4 -f gif   # 透過GIF
```

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-i, --input <path>` | 入力ファイルまたはフォルダ | `./input` |
| `-o, --output <path>` | 出力フォルダ | `./output` |
| `-f, --format <format>` | 動画出力形式 (webm, mov, gif) | `webm` |
| `-q, --quality <quality>` | 出力品質 (low, medium, high) | `medium` |

## 対応形式

**入力:**
- 画像: jpg, jpeg, png, webp, bmp, tiff
- 動画: mp4, mov, webm, avi, mkv, m4v, ogv

**出力:**
- 画像: PNG（透過）
- 動画: WebM / MOV (ProRes 4444) / GIF

## 開発

```bash
# クローン後
npm install
npm run build

# 開発時
npm run dev -- -i ./input -o ./output
```

## 技術スタック

- **@imgly/background-removal-node** - AI背景除去（ONNX Runtime）
- **sharp** - 画像処理
- **FFmpeg** - 動画処理
- **TypeScript** + **tsup**

## License

MIT
