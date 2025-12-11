# 使用 Claude Agent SDK 写一个 DeepResearch Agent

## 什么是 DeepResearch Agent？

DeepResearch Agent 是一个**多 Agent 协作系统**，它能够像真正的研究团队一样工作：

1. **Lead Agent（协调者）**：负责分解研究任务，调度其他 Agent
2. **Researcher（研究员）**：负责搜索网络、收集资料
3. **Report Writer（报告编写）**：负责将研究结果整理成报告

这种架构的好处是**分工明确、并行执行**——多个研究员可以同时研究不同的子主题，大大提高效率。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Lead Agent (协调者)                      │
│                   只有 Task 工具，负责调度                      │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
          ┌───────────▼───────┐   ┌───────▼───────────┐
          │   Researcher ×N   │   │   Report-Writer   │
          │  WebSearch, Write │   │ Glob, Read, Write │
          └───────────────────┘   └───────────────────┘
```

## 核心实现

### 1. 定义 Subagent

在 `agent.ts` 中，我们定义了两个专业化的 subagent：

```typescript
// 定义专业化的 subagent
const agents = {
  researcher: {
    description:
      "Use this agent when you need to gather research information on any topic. " +
      "The researcher uses web search to find relevant information, articles, and sources " +
      "from across the internet. Writes research findings to files/research_notes/ " +
      "for later use by report writers.",
    tools: ["WebSearch", "Write"],  // 可以搜索网络和写入文件
    prompt: researcherPrompt,        // 研究员的系统提示词
    model: "haiku" as const,
  },
  "report-writer": {
    description:
      "Use this agent when you need to create a formal research report document. " +
      "The report-writer reads research findings from files/research_notes/ and synthesizes " +
      "them into clear, concise, professionally formatted reports in files/reports/.",
    tools: ["Skill", "Write", "Glob", "Read"], // 可以查找、读取和写入文件
    prompt: reportWriterPrompt,
    model: "haiku" as const,
  },
};
```

**关键点解释：**
- `description`：告诉 Lead Agent 什么时候应该调用这个 subagent
- `tools`：该 subagent 可以使用的工具
- `prompt`：该 subagent 的系统提示词，定义它的行为
- `model`：使用的模型

### 2. Lead Agent 的提示词

`prompts/lead-agent.ts` 中定义了协调者的行为：

```typescript
export const leadAgentPrompt = `You are a lead research coordinator who orchestrates comprehensive multi-agent research projects.

**CRITICAL RULES:**
1. You MUST delegate ALL research and report writing to specialized subagents. You NEVER research or write reports yourself.
2. Keep ALL responses SHORT - maximum 2-3 sentences.
3. Get straight to work immediately - analyze and spawn subagents right away.

<workflow>
**STEP 1: ANALYZE USER REQUEST**
- Understand the research topic and scope
- Identify 2-4 distinct subtopics or angles to investigate

**STEP 2: SPAWN RESEARCHER SUBAGENTS (IN PARALLEL)**
- Use Task tool to spawn 2-4 researcher subagents simultaneously
- Give EACH researcher a specific, focused subtopic to investigate

**STEP 3: WAIT FOR RESEARCH COMPLETION**
- All researchers will complete their work and save findings
- Do NOT proceed until all researchers have finished

**STEP 4: SPAWN REPORT-WRITER SUBAGENT**
- Use Task tool to spawn ONE report-writer subagent
- Instruct it to read ALL research notes and create a synthesis report
</workflow>

<task_tool_usage>
For researchers:
- subagent_type: "researcher"
- description: Brief description of the subtopic
- prompt: Detailed instructions on what to research

For report-writer:
- subagent_type: "report-writer"  
- description: "Synthesize research into final report"
- prompt: "Read all research notes from files/research_notes/ and create a report in files/reports/"
</task_tool_usage>
`;
```

### 3. 研究员的提示词

`prompts/researcher.ts` 定义了研究员如何工作：

```typescript
export const researcherPrompt = `You are a research specialist focused on information gathering.

**CRITICAL: You MUST use WebSearch for ALL research. You MUST save research summaries to files/research_notes/ folder.**

<workflow>
1. IMMEDIATELY use WebSearch with well-crafted queries
2. Use WebSearch multiple times (3-7 searches) with different angles
3. Extract key findings from WebSearch results
4. SAVE findings to files/research_notes/{topic_name}.md using Write tool
5. Return brief confirmation that research was saved

CRITICAL: NEVER rely on your own knowledge - ONLY use WebSearch results.
</workflow>
`;
```

### 4. 报告编写的提示词

`prompts/report-writer.ts`：

```typescript
export const reportWriterPrompt = `You are a professional report writer who creates clear, concise research summaries.

**CRITICAL: You MUST read research notes from files/research_notes/ folder.**

<workflow>
1. Use Glob to find all research notes in files/research_notes/
2. Use Read to load each research note file
3. Synthesize all research notes into a cohesive report
4. Save to files/reports/ folder as .txt file
</workflow>

<requirements>
- One-page length (500-800 words)
- Every claim must have a citation
- Clear, professional language
</requirements>
`;
```

### 5. 启动 Agent

在 `agent.ts` 的 `chat()` 函数中，把所有部分组合起来：

```typescript
import { query, type Query, type SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";

export async function chat(): Promise<void> {
  // ... 省略初始化代码

  // 用于会话连续性的 Session ID
  let sessionId: string | undefined;

  while (true) {
    const userInput = await askQuestion();
    if (!userInput) break;

    // 发送给 agent
    const result: Query = query({
      prompt: userInput,
      options: {
        resume: sessionId,                    // 恢复会话
        permissionMode: "bypassPermissions",  // 跳过权限确认
        systemPrompt: leadAgentPrompt,        // Lead Agent 的提示词
        allowedTools: ["Task"],               // Lead Agent 只能用 Task 调度 subagent
        agents,                               // 注册的 subagent 定义
        model: "haiku",
      },
    });

    // 流式处理响应
    for await (const msg of result) {
      switch (msg.type) {
        case "system":
          if (msg.subtype === "init") {
            sessionId = msg.session_id;  // 保存 session ID
          }
          break;
        case "assistant":
          processAssistantMessage(msg, tracker, transcript);
          break;
      }
    }
  }
}
```

### 6. 处理 Assistant 消息

```typescript
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
      // 输出文本内容
      transcript.write(block.text, "");
    } else if (block.type === "tool_use" && block.name === "Task") {
      // 检测到生成 subagent
      const input = block.input || {};
      const subagentType = String(input.subagent_type || "unknown");
      const description = String(input.description || "no description");
      const prompt = String(input.prompt || "");

      // 注册 subagent
      const subagentId = tracker.registerSubagentSpawn(
        block.id || "",
        subagentType,
        description,
        prompt
      );

      // 面向用户的输出
      transcript.write(`\n\n[🚀 Spawning ${subagentId}: ${description}]\n`, "");
    }
  }
}
```

## 运行效果

当你输入"Research quantum computing developments"时，系统会：

```
Agent: Breaking this into 4 research areas: hardware/qubits, algorithms/applications, 
industry players/investments, and challenges/timeline. Spawning researchers.

============================================================
🚀 SUBAGENT SPAWNED: RESEARCHER-1
============================================================
Task: Quantum hardware and qubit technology
============================================================

[🚀 Spawning RESEARCHER-1: Quantum hardware and qubit technology]

============================================================
🚀 SUBAGENT SPAWNED: RESEARCHER-2
============================================================
Task: Quantum algorithms and applications
============================================================

[RESEARCHER-1] → WebSearch
[RESEARCHER-2] → WebSearch
[RESEARCHER-1] → Write
[RESEARCHER-2] → Write

============================================================
🚀 SUBAGENT SPAWNED: REPORT-WRITER-1
============================================================
Task: Synthesize research into final report
============================================================

[REPORT-WRITER-1] → Glob
[REPORT-WRITER-1] → Read
[REPORT-WRITER-1] → Write

Agent: Research complete. Report saved to files/reports/quantum_computing_summary.txt
```

## 关键概念总结

| 概念 | 说明 |
|------|------|
| `agents` | 定义可用的 subagent，包括 description、tools、prompt、model |
| `allowedTools: ["Task"]` | Lead Agent 只能用 Task 工具来调度 subagent |
| `Task` 工具 | SDK 内置工具，用于生成 subagent |
| `parent_tool_use_id` | 用于追踪哪个 subagent 在执行 |
| `resume: sessionId` | 保持会话连续性，支持多轮对话 |

## 运行项目

```bash
# 设置 API Key
export ANTHROPIC_API_KEY=your_key

# 运行
npx tsx src/research-agent/agent.ts
```

这就是使用 Claude Agent SDK 构建 DeepResearch Agent 的核心实现——通过定义专业化的 subagent，让 AI 像一个研究团队一样协作完成复杂的研究任务。
