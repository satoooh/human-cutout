import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);

export interface VideoInfo {
  width: number;
  height: number;
  fps: number;
  frames: number;
  duration: number;
}

export async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  const { stdout } = await execAsync(
    `ffprobe -v quiet -print_format json -show_streams -show_format "${videoPath}"`
  );

  const data = JSON.parse(stdout);
  const videoStream = data.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video"
  );

  if (!videoStream) {
    throw new Error("No video stream found");
  }

  // FPSをパース (例: "30/1" or "29.97")
  let fps = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den ? num / den : num;
  }

  const duration = parseFloat(data.format?.duration || "0");
  const frames = Math.ceil(fps * duration);

  return {
    width: videoStream.width,
    height: videoStream.height,
    fps,
    frames,
    duration,
  };
}

export async function extractFrames(
  videoPath: string,
  outputDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const outputPattern = path.join(outputDir, "frame_%06d.png");

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-vsync",
      "0",
      outputPattern,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

export async function createVideo(
  framesDir: string,
  outputPath: string,
  fps: number,
  format: "webm" | "mov" | "gif"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const inputPattern = path.join(framesDir, "frame_%06d.png");

    let args: string[];

    switch (format) {
      case "webm":
        args = [
          "-y",
          "-framerate",
          fps.toString(),
          "-i",
          inputPattern,
          "-c:v",
          "libvpx-vp9",
          "-pix_fmt",
          "yuva420p",
          "-auto-alt-ref",
          "0",
          "-b:v",
          "2M",
          "-crf",
          "30",
          outputPath,
        ];
        break;

      case "mov":
        args = [
          "-y",
          "-framerate",
          fps.toString(),
          "-i",
          inputPattern,
          "-c:v",
          "prores_ks",
          "-profile:v",
          "4444",
          "-pix_fmt",
          "yuva444p10le",
          outputPath,
        ];
        break;

      case "gif":
        args = [
          "-y",
          "-framerate",
          fps.toString(),
          "-i",
          inputPattern,
          "-filter_complex",
          "[0:v] split [a][b];[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];[b][p] paletteuse",
          outputPath,
        ];
        break;
    }

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}
