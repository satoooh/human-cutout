interface ProcessOptions {
    format: "webm" | "mov" | "gif";
    quality: "low" | "medium" | "high";
}
declare function processFiles(inputPath: string, outputDir: string, options: ProcessOptions): Promise<void>;

interface VideoInfo {
    width: number;
    height: number;
    fps: number;
    frames: number;
    duration: number;
}
declare function checkFfmpeg(): Promise<boolean>;
declare function getVideoInfo(videoPath: string): Promise<VideoInfo>;

export { type ProcessOptions, type VideoInfo, checkFfmpeg, getVideoInfo, processFiles };
