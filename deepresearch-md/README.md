# Claude Agent DeepResearch (Markdown 驱动)

使用 Markdown 文件定义 Agent 的 DeepResearch 系统，更直观易维护。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Lead Agent (协调者)                        │
│                   只有 Task 工具，负责调度                      │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
          ┌───────────▼───────┐   ┌───────▼───────────┐
          │   Researcher ×N   │   │   Report-Writer   │
          │  WebSearch, Write │   │ Glob, Read, Write │
          │ → research_notes/ │   │ → reports/        │
          └───────────────────┘   └───────────────────┘
```

## Agent 定义

Agent 使用 Markdown 文件定义，位于 `.claude/agents/` 目录：

- `lead-agent.md` - 协调者 Agent
- `researcher.md` - 研究员 Agent
- `report-writer.md` - 报告编写 Agent

### Markdown 格式

```markdown
---
name: agent-name
description: Agent 的描述
tools: Tool1, Tool2
---

Agent 的系统提示词内容...
```

## 安装

```bash
npm install
```

## 配置

设置系统环境变量：

```bash
export ANTHROPIC_API_KEY=your_api_key
```

## 使用

```bash
npm run dev
```

## 与代码驱动的区别

| 特性 | 代码驱动 | Markdown 驱动 |
|------|---------|--------------|
| Prompt 定义 | TypeScript 文件 | Markdown 文件 |
| 修改方式 | 修改代码 | 修改 Markdown |
| 可读性 | 一般 | 更直观 |
| 适用场景 | 复杂逻辑 | 快速迭代 |
