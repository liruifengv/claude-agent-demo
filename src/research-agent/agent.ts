/**
 * Research Agent - TypeScript 实现
 *
 * 一个多 Agent 研究系统，协调专业化的 subagent 来完成
 * 综合性的研究任务并生成报告。
 *
 * 架构：
 * - Lead Agent（协调者）：协调研究任务，生成 subagent
 * - Researcher（研究员）：搜索网络并保存研究笔记
 * - Report Writer（报告编写）：将研究笔记综合成正式报告
 */

import * as readline from "node:readline";
import * as path from "node:path";
import * as fs from "node:fs";
import { query, type Query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";

import { leadAgentPrompt } from "./prompts/lead-agent";
import { researcherPrompt } from "./prompts/researcher";
import { reportWriterPrompt } from "./prompts/report-writer";
import { SubagentTracker } from "./utils/subagent-tracker";
import { setupSession, TranscriptWriter } from "./utils/transcript";

// 当前 agent 的基础目录
const BASE_DIR = path.dirname(new URL(import.meta.url).pathname);

/**
 * 处理 assistant 消息并写入 transcript。
 */
function processAssistantMessage(
  msg: SDKAssistantMessage,
  tracker: SubagentTracker,
  transcript: TranscriptWriter
): void {
  // 使用消息中的 parent_tool_use_id 更新 tracker 上下文
  const parentId = msg.parent_tool_use_id;
  tracker.setCurrentContext(parentId ?? undefined);

  for (const block of msg.message.content) {
    if (block.type === "text" && block.text) {
      transcript.write(block.text, "");
    } else if (block.type === "tool_use" && block.name === "Task") {
      console.log("\n[DEBUG] Detected Task tool use block:", block);
      // 仅处理 Task 工具（subagent 生成）
      const input = block.input || {};
      const subagentType = String(input.subagent_type || "unknown");
      const description = String(input.description || "no description");
      const prompt = String(input.prompt || "");

      // 向 tracker 注册并获取 subagent ID
      const subagentId = tracker.registerSubagentSpawn(
        block.id || "",
        subagentType,
        description,
        prompt
      );

      // 面向用户的输出，包含 subagent ID
      transcript.write(`\n\n[🚀 Spawning ${subagentId}: ${description}]\n`, "");
    }
  }
}

/**
 * 启动与 research agent 的交互式对话。
 */
export async function chat(): Promise<void> {
  // 首先检查 API 密钥，在创建任何文件之前
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\nError: ANTHROPIC_API_KEY not found.");
    console.log("Set it in a .env file or export it in your shell.");
    console.log("Get your key at: https://console.anthropic.com/settings/keys\n");
    return;
  }

  // 设置会话目录和 transcript
  const [transcriptFile, sessionDir] = setupSession(BASE_DIR);

  // 创建 transcript 写入器
  const transcript = new TranscriptWriter(transcriptFile);

  // 确保输出目录存在
  const researchNotesDir = path.join(BASE_DIR, "files", "research_notes");
  const reportsDir = path.join(BASE_DIR, "files", "reports");
  fs.mkdirSync(researchNotesDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  // 使用 transcript 写入器和会话目录初始化 subagent tracker
  const tracker = new SubagentTracker(transcript, sessionDir);

  // 定义专业化的 subagent
  const agents = {
    researcher: {
      description:
        "Use this agent when you need to gather research information on any topic. " +
        "The researcher uses web search to find relevant information, articles, and sources " +
        "from across the internet. Writes research findings to files/research_notes/ " +
        "for later use by report writers. Ideal for complex research tasks " +
        "that require deep searching and cross-referencing.",
      tools: ["WebSearch", "Write"],
      prompt: researcherPrompt,
      model: "haiku" as const,
    },
    "report-writer": {
      description:
        "Use this agent when you need to create a formal research report document. " +
        "The report-writer reads research findings from files/research_notes/ and synthesizes " +
        "them into clear, concise, professionally formatted reports in files/reports/. " +
        "Ideal for creating structured documents with proper citations and organization. " +
        "Does NOT conduct web searches - only reads existing research notes and creates reports.",
      tools: ["Skill", "Write", "Glob", "Read"],
      prompt: reportWriterPrompt,
      model: "haiku" as const,
    },
  };

  // 设置用于追踪的 hooks
  const hooks = {
    PreToolUse: [
      {
        matcher: undefined, // 匹配所有工具
        hooks: [tracker.preToolUseHook],
      },
    ],
    PostToolUse: [
      {
        matcher: undefined, // 匹配所有工具
        hooks: [tracker.postToolUseHook],
      },
    ],
  };

  console.log("\n=== Research Agent ===");
  console.log(
    "Ask me to research any topic, gather information, or analyze documents."
  );
  console.log(
    "I can delegate complex tasks to specialized researcher and report-writer agents."
  );
  console.log(`\nRegistered subagents: ${Object.keys(agents).join(", ")}`);
  console.log(`Session logs: ${sessionDir}`);
  console.log("Type 'exit' or 'quit' to end.\n");

  // 用于会话连续性的 Session ID
  let sessionId: string | undefined;

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question("\nYou: ", (answer) => {
        resolve(answer.trim());
      });
    });
  };

  try {
    while (true) {
      // 获取用户输入
      let userInput: string;
      try {
        userInput = await askQuestion();
      } catch {
        break;
      }

      if (!userInput || ["exit", "quit", "q"].includes(userInput.toLowerCase())) {
        break;
      }

      // 将用户输入写入 transcript（仅写入文件，不输出到控制台）
      transcript.writeToFile(`\nYou: ${userInput}\n`);

      // 发送给 agent
      const result: Query = query({
        prompt: userInput,
        options: {
          resume: sessionId,
          permissionMode: "bypassPermissions",
          systemPrompt: leadAgentPrompt,
          allowedTools: ["Task"],
          agents,
          hooks,
          model: "haiku",
        },
      });

      transcript.write("\nAgent: ", "");

      // 流式处理响应
      for await (const msg of result) {
        switch (msg.type) {
          case "system":
            if (msg.subtype === "init") {
              sessionId = msg.session_id;
            }
            break;
          case "assistant":
            processAssistantMessage(
              msg,
              tracker,
              transcript
            );
            break;
        }
      }

      transcript.write("\n", "");
    }
  } finally {
    transcript.write("\n\nGoodbye!\n", "");
    transcript.close();
    tracker.close();
    rl.close();
    console.log(`\nSession logs saved to: ${sessionDir}`);
    console.log(`  - Transcript: ${transcriptFile}`);
    console.log(`  - Tool calls: ${path.join(sessionDir, "tool_calls.jsonl")}`);
  }
}

// 作为主模块运行
chat().catch(console.error);
