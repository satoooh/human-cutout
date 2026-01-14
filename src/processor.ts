import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import ora from "ora";
import { extractFrames, createVideo, getVideoInfo } from "./ffmpeg.js";

// @imgly/background-removal-nodeのリソースパスを解決
const require = createRequire(import.meta.url);
const imglyPath = path.dirname(require.resolve("@imgly/background-removal-node"));
const publicPath = `file://${imglyPath}/`;

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
  ".m4v",
  ".ogv",
]);
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tiff",
]);

export interface ProcessOptions {
  format: "webm" | "mov" | "gif";
  quality: "low" | "medium" | "high";
}

function isVideo(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isImage(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function getFiles(inputPath: string): string[] {
  const stat = fs.statSync(inputPath);

  if (stat.isFile()) {
    return [inputPath];
  }

  return fs
    .readdirSync(inputPath)
    .map((file) => path.join(inputPath, file))
    .filter((file) => {
      const stat = fs.statSync(file);
      return stat.isFile() && (isVideo(file) || isImage(file));
    });
}

async function removeBackgroundFromImage(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // ファイルURLとして渡す（Node.js環境で安定）
  const fileUrl = `file://${inputPath}`;

  const resultBlob = await removeBackground(fileUrl, {
    publicPath,
  });
  const arrayBuffer = await resultBlob.arrayBuffer();
  const resultBuffer = Buffer.from(arrayBuffer);

  // PNGとして保存（透過対応）
  const pngOutput = outputPath.replace(/\.[^.]+$/, ".png");
  await sharp(resultBuffer).png().toFile(pngOutput);
}

async function processImage(
  inputPath: string,
  outputDir: string
): Promise<void> {
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${fileName}_cutout.png`);

  const spinner = ora(`Processing: ${path.basename(inputPath)}`).start();

  try {
    await removeBackgroundFromImage(inputPath, outputPath);
    spinner.succeed(`Done: ${path.basename(outputPath)}`);
  } catch (error) {
    spinner.fail(`Failed: ${path.basename(inputPath)}`);
    throw error;
  }
}

async function processVideo(
  inputPath: string,
  outputDir: string,
  options: ProcessOptions
): Promise<void> {
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputExt = options.format === "mov" ? ".mov" : options.format === "gif" ? ".gif" : ".webm";
  const outputPath = path.join(outputDir, `${fileName}_cutout${outputExt}`);

  console.log(`\n📹 Processing: ${path.basename(inputPath)}`);

  // 一時ディレクトリ
  const tmpDir = path.join(outputDir, ".tmp", fileName);
  const rawFramesDir = path.join(tmpDir, "raw");
  const transparentFramesDir = path.join(tmpDir, "transparent");

  fs.mkdirSync(rawFramesDir, { recursive: true });
  fs.mkdirSync(transparentFramesDir, { recursive: true });

  try {
    // 動画情報取得
    const videoInfo = await getVideoInfo(inputPath);
    console.log(
      `   ${videoInfo.width}x${videoInfo.height}, ${videoInfo.fps.toFixed(2)}fps, ${videoInfo.frames} frames`
    );

    // フレーム抽出
    const extractSpinner = ora("Extracting frames...").start();
    await extractFrames(inputPath, rawFramesDir);
    extractSpinner.succeed("Frames extracted");

    // 背景除去
    const frameFiles = fs
      .readdirSync(rawFramesDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    const bgSpinner = ora(
      `Removing backgrounds (0/${frameFiles.length})`
    ).start();

    for (let i = 0; i < frameFiles.length; i++) {
      const frameFile = frameFiles[i];
      const inputFrame = path.join(rawFramesDir, frameFile);
      const outputFrame = path.join(transparentFramesDir, frameFile);

      await removeBackgroundFromImage(inputFrame, outputFrame);

      bgSpinner.text = `Removing backgrounds (${i + 1}/${frameFiles.length})`;
    }
    bgSpinner.succeed("Backgrounds removed");

    // 動画作成
    const videoSpinner = ora("Creating video...").start();
    await createVideo(
      transparentFramesDir,
      outputPath,
      videoInfo.fps,
      options.format
    );
    videoSpinner.succeed(`Created: ${path.basename(outputPath)}`);
  } finally {
    // 一時ファイル削除
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function processFiles(
  inputPath: string,
  outputDir: string,
  options: ProcessOptions
): Promise<void> {
  const files = getFiles(inputPath);

  if (files.length === 0) {
    throw new Error(`No supported files found in: ${inputPath}`);
  }

  const images = files.filter(isImage);
  const videos = files.filter(isVideo);

  console.log(`📁 Found: ${images.length} image(s), ${videos.length} video(s)`);

  // 画像処理
  for (const image of images) {
    await processImage(image, outputDir);
  }

  // 動画処理
  for (const video of videos) {
    await processVideo(video, outputDir, options);
  }
}
