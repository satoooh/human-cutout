import { program } from "commander";
import { processFiles } from "./processor.js";
import { checkFfmpeg } from "./ffmpeg.js";
import path from "node:path";
import fs from "node:fs";

program
  .name("human-cutout")
  .description("AI-powered background removal for images and videos")
  .version("1.0.0")
  .option("-i, --input <path>", "Input file or directory", "./input")
  .option("-o, --output <path>", "Output directory", "./output")
  .option(
    "-f, --format <format>",
    "Video output format (webm, mov, gif)",
    "webm"
  )
  .option("-q, --quality <quality>", "Output quality (low, medium, high)", "medium")
  .parse();

const options = program.opts();

async function main() {
  console.log("\n🎬 human-cutout - AI Background Removal\n");

  // FFmpegチェック
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    console.error("❌ FFmpeg is required but not found.");
    console.error("   Install: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)");
    process.exit(1);
  }

  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  // 入力チェック
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input not found: ${inputPath}`);
    process.exit(1);
  }

  // 出力ディレクトリ作成
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const validFormats = ["webm", "mov", "gif"];
  if (!validFormats.includes(options.format)) {
    console.error(`❌ Invalid format: ${options.format}`);
    console.error(`   Valid formats: ${validFormats.join(", ")}`);
    process.exit(1);
  }

  try {
    await processFiles(inputPath, outputPath, {
      format: options.format as "webm" | "mov" | "gif",
      quality: options.quality as "low" | "medium" | "high",
    });
    console.log(`\n✅ Done! Output: ${outputPath}\n`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
