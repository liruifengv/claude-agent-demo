/**
 * Subagent 追踪器
 * 通过 hooks 和消息流解析，实现对 subagent 工具调用的全面追踪系统。
 */

import * as fs from "fs";
import * as path from "path";
import type { TranscriptWriter } from "./transcript";
import type { HookJSONOutput, PostToolUseHookInput, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

/**
 * 单次工具调用的记录。
 */
interface ToolCallRecord {
  timestamp: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
  subagentType: string;
  parentToolUseId?: string;
  toolOutput?: unknown;
  error?: string;
}

/**
 * Subagent 执行会话的信息。
 */
interface SubagentSession {
  subagentType: string;
  parentToolUseId: string;
  spawnedAt: string;
  description: string;
  promptPreview: string;
  subagentId: string; // 唯一标识符，如 "RESEARCHER-1"
  toolCalls: ToolCallRecord[];
}

/**
 * 追踪所有 subagent 的工具调用，使用 hooks 和消息流解析。
 *
 * 该追踪器：
 * 1. 监控消息流，检测通过 Task 工具生成的 subagent
 * 2. 使用 hooks（PreToolUse/PostToolUse）捕获所有工具调用
 * 3. 将工具调用关联到对应的 subagent
 * 4. 将工具使用情况记录到控制台和 transcript 文件
 */
export class SubagentTracker {
  // 映射：parentToolUseId -> SubagentSession
  private sessions: Map<string, SubagentSession> = new Map();

  // 映射：toolUseId -> ToolCallRecord（用于在 post hook 中高效查找）
  private toolCallRecords: Map<string, ToolCallRecord> = new Map();

  // 当前执行上下文（来自消息流）
  private currentParentId?: string;

  // 每种 subagent 类型的计数器，用于创建唯一 ID
  private subagentCounters: Map<string, number> = new Map();

  // Transcript 写入器，用于记录简洁的输出
  private transcriptWriter?: TranscriptWriter;

  // 工具调用详细日志（JSONL 格式）文件句柄
  private toolLogFile?: fs.WriteStream;

  constructor(transcriptWriter?: TranscriptWriter, sessionDir?: string) {
    this.transcriptWriter = transcriptWriter;

    if (sessionDir) {
      const toolLogPath = path.join(sessionDir, "tool_calls.jsonl");
      this.toolLogFile = fs.createWriteStream(toolLogPath, { encoding: "utf-8" });
    }
  }

  /**
   * 注册从消息流中检测到的新 subagent 生成。
   *
   * @param toolUseId - Task 工具调用块的 ID
   * @param subagentType - Subagent 类型（如 'researcher', 'report-writer'）
   * @param description - 任务的简要描述
   * @param prompt - 给 subagent 的完整 prompt
   * @returns 生成的 subagent_id（如 'RESEARCHER-1'）
   */
  registerSubagentSpawn(
    toolUseId: string,
    subagentType: string,
    description: string,
    prompt: string
  ): string {
    // 递增该 subagent 类型的计数器并创建唯一 ID
    const count = (this.subagentCounters.get(subagentType) || 0) + 1;
    this.subagentCounters.set(subagentType, count);
    const subagentId = `${subagentType.toUpperCase()}-${count}`;

    const session: SubagentSession = {
      subagentType,
      parentToolUseId: toolUseId,
      spawnedAt: new Date().toISOString(),
      description,
      promptPreview: prompt.length > 200 ? prompt.slice(0, 200) + "..." : prompt,
      subagentId,
      toolCalls: [],
    };

    this.sessions.set(toolUseId, session);

    console.log("=".repeat(60));
    console.log(`🚀 SUBAGENT SPAWNED: ${subagentId}`);
    console.log("=".repeat(60));
    console.log(`Task: ${description}`);
    console.log("=".repeat(60));

    return subagentId;
  }

  /**
   * 从消息流更新当前执行上下文。
   *
   * @param parentToolUseId - 当前消息中的父工具调用 ID
   */
  setCurrentContext(parentToolUseId?: string): void {
    this.currentParentId = parentToolUseId;
  }

  /**
   * 辅助方法：将工具使用记录到控制台、transcript 和详细日志。
   */
  private logToolUse(
    agentLabel: string,
    toolName: string,
    toolInput?: Record<string, unknown>
  ): void {
    // 控制台和 transcript：简短消息
    const message = `\n[${agentLabel}] → ${toolName}\n`;
    console.log(message.trim());

    if (this.transcriptWriter) {
      this.transcriptWriter.write(message);
      // 仅写入 transcript 文件：添加输入详情
      if (toolInput) {
        const detail = this.formatToolInput(toolInput);
        if (detail) {
          this.transcriptWriter.writeToFile(`    Input: ${detail}\n`);
        }
      }
    }
  }

  /**
   * 格式化工具输入，用于人类可读的日志记录。
   */
  private formatToolInput(
    toolInput: Record<string, unknown>,
    maxLength: number = 100
  ): string {
    if (!toolInput) {
      return "";
    }

    // WebSearch：显示查询内容
    if ("query" in toolInput) {
      const query = String(toolInput.query);
      return `query='${query.length <= maxLength ? query : query.slice(0, maxLength) + "..."}'`;
    }

    // Write：显示文件路径和内容大小
    if ("file_path" in toolInput && "content" in toolInput) {
      const filename = path.basename(String(toolInput.file_path));
      const content = String(toolInput.content);
      return `file='${filename}' (${content.length} chars)`;
    }

    // Read/Glob：显示路径或模式
    if ("file_path" in toolInput) {
      return `path='${toolInput.file_path}'`;
    }
    if ("pattern" in toolInput) {
      return `pattern='${toolInput.pattern}'`;
    }

    // Task：显示 subagent 生成信息
    if ("subagent_type" in toolInput) {
      return `spawn=${toolInput.subagent_type || ""} (${toolInput.description || ""})`;
    }

    // 兜底：通用格式（截断）
    const str = JSON.stringify(toolInput);
    return str.length <= maxLength ? str : str.slice(0, maxLength) + "...";
  }

  /**
   * 将结构化日志条目写入 JSONL 文件。
   */
  private logToJsonl(logEntry: Record<string, unknown>): void {
    if (this.toolLogFile) {
      this.toolLogFile.write(JSON.stringify(logEntry) + "\n");
    }
  }

  /**
   * PreToolUse 事件的 Hook 回调 - 捕获工具调用。
   */
  preToolUseHook = async (
    hookInput: unknown
  ): Promise<HookJSONOutput> => {
    const input = hookInput as PreToolUseHookInput;
    const toolName = input.tool_name;
    const toolInput = (input.tool_input || {}) as Record<string, unknown>;
    const toolUseId = input.tool_use_id;
    const timestamp = new Date().toISOString();

    // 确定 agent 上下文
    const isSubagent =
      this.currentParentId && this.sessions.has(this.currentParentId);

    if (isSubagent) {
      const session = this.sessions.get(this.currentParentId!)!;
      const agentId = session.subagentId;
      const agentType = session.subagentType;

      // 为 subagent 创建并存储记录
      const record: ToolCallRecord = {
        timestamp,
        toolName,
        toolInput,
        toolUseId,
        subagentType: agentType,
        parentToolUseId: this.currentParentId,
      };
      session.toolCalls.push(record);
      this.toolCallRecords.set(toolUseId, record);

      // 记录日志
      this.logToolUse(agentId, toolName, toolInput);
      this.logToJsonl({
        event: "tool_call_start",
        timestamp,
        tool_use_id: toolUseId,
        agent_id: agentId,
        agent_type: agentType,
        tool_name: toolName,
        tool_input: toolInput,
        parent_tool_use_id: this.currentParentId,
      });
    } else if (toolName !== "Task") {
      // 跳过 main agent 的 Task 调用（由 spawn 消息处理）
      // Main agent 工具调用
      this.logToolUse("MAIN AGENT", toolName, toolInput);
      this.logToJsonl({
        event: "tool_call_start",
        timestamp,
        tool_use_id: toolUseId,
        agent_id: "MAIN_AGENT",
        agent_type: "lead",
        tool_name: toolName,
        tool_input: toolInput,
      });
    }

    return { continue: true };
  };

  /**
   * PostToolUse 事件的 Hook 回调 - 捕获工具执行结果。
   */
  postToolUseHook = async (
    hookInput: unknown
  ): Promise<HookJSONOutput> => {
    const input = hookInput as PostToolUseHookInput;
    const toolResponse = input.tool_response;
    const toolUseId = input.tool_use_id;
    const record = this.toolCallRecords.get(toolUseId);

    if (!record) {
      return { continue: true };
    }

    // 更新记录的输出
    record.toolOutput = toolResponse;

    // 检查错误
    const error =
      typeof toolResponse === "object" && toolResponse !== null
        ? (toolResponse as Record<string, unknown>).error
        : undefined;

    if (error) {
      record.error = String(error);
      const session = this.sessions.get(record.parentToolUseId || "");
      if (session) {
        console.warn(
          `[${session.subagentId}] Tool ${record.toolName} error: ${error}`
        );
      }
    }

    // 获取 agent 信息用于日志记录
    const session = this.sessions.get(record.parentToolUseId || "");
    const agentId = session ? session.subagentId : "MAIN_AGENT";
    const agentType = session ? session.subagentType : "lead";

    // 将完成记录写入 JSONL
    this.logToJsonl({
      event: "tool_call_complete",
      timestamp: new Date().toISOString(),
      tool_use_id: toolUseId,
      agent_id: agentId,
      agent_type: agentType,
      tool_name: record.toolName,
      success: error === undefined,
      error: error ? String(error) : undefined,
      output_size: toolResponse ? String(toolResponse).length : 0,
    });

    return { continue: true };
  };

  /**
   * 关闭工具日志文件。
   */
  close(): void {
    if (this.toolLogFile) {
      this.toolLogFile.end();
    }
  }
}
