/**
 * 会话记录处理
 * 用于保存对话历史。
 */

import * as fs from "fs";
import * as path from "path";

/**
 * 设置会话目录和 transcript 文件。
 *
 * 在 logs/ 目录下创建带时间戳的会话文件夹，
 * 包含 transcript 和详细的工具调用日志。
 *
 * @param baseDir - 日志基础目录（默认：src/research-agent）
 * @returns [transcriptFilePath, sessionDirPath] 元组
 */
export function setupSession(baseDir: string): [string, string] {
  // 创建会话目录
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .slice(0, 15);
  const sessionDir = path.join(baseDir, "logs", `session_${timestamp}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  // 会话目录中的 transcript 文件
  const transcriptFile = path.join(sessionDir, "transcript.txt");

  return [transcriptFile, sessionDir];
}

/**
 * 辅助类：将输出同时写入控制台和 transcript 文件。
 */
export class TranscriptWriter {
  private file: fs.WriteStream;

  constructor(transcriptFile: string) {
    this.file = fs.createWriteStream(transcriptFile, { encoding: "utf-8" });
  }

  /**
   * 将文本写入控制台和 transcript 文件。
   */
  write(text: string, end: string = "", flush: boolean = true): void {
    process.stdout.write(text + end);
    this.file.write(text + end);
    if (flush) {
      // Node.js 流会自动刷新，但我们可以强制刷新
    }
  }

  /**
   * 仅将文本写入 transcript 文件（不输出到控制台）。
   */
  writeToFile(text: string, _flush: boolean = true): void {
    this.file.write(text);
  }

  /**
   * 关闭 transcript 文件。
   */
  close(): void {
    this.file.end();
  }
}
