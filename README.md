# Claude Agent Demo

基于 [Claude Agent SDK](https://docs.claude.com/en/docs/agent-sdk/overview) 的 Node.js + TypeScript 演示项目集合。

## 项目结构

本仓库包含三个独立项目：

```
claude-agent-demo/
├── basic/                   # 基础示例
├── deepresearch/            # DeepResearch Agent (代码驱动)
└── deepresearch-md/         # DeepResearch Agent (Markdown 驱动)
```

### 1. basic - 基础示例

展示 Claude Agent SDK 的核心用法，包含 4 个从简单到复杂的示例：

- 基础 query 调用
- Session ID 管理
- TUI 终端聊天
- 带工具的聊天（MCP + 计算器）

```bash
cd basic && npm install && npm run dev
```

详见 [basic/README.md](basic/README.md)

### 2. deepresearch - 代码驱动

多 Agent 协作的研究系统，使用 TypeScript 代码定义 Agent prompts。

```
Lead Agent (协调者) ──┬──▶ Researcher ×N (研究员)
                     │      WebSearch → research_notes/
                     │
                     └──▶ Report-Writer (报告编写)
                            Read → reports/
```

```bash
cd deepresearch && npm install && npm run dev
```

详见 [deepresearch/README.md](deepresearch/README.md)

### 3. deepresearch-md - Markdown 驱动

同样的多 Agent 研究系统，但使用 Markdown 文件定义 Agent，更直观易维护。

Agent 定义文件位于 `.claude/agents/` 目录：
- `lead-agent.md`
- `researcher.md`
- `report-writer.md`

```bash
cd deepresearch-md && npm install && npm run dev
```

详见 [deepresearch-md/README.md](deepresearch-md/README.md)

## 快速开始

### 环境要求

- Node.js 18+
- Anthropic API Key

### 安装所有项目

```bash
npm run install:all
```

### 配置 API Key

设置系统环境变量：

```bash
export ANTHROPIC_API_KEY=your_api_key
```

> 可以使用 [aihubmix](https://aihubmix.com/?aff=uTxe) 获取 API Key。

### 运行项目

```bash
# 运行基础示例
npm run basic

# 运行代码驱动的 DeepResearch
npm run deepresearch

# 运行 Markdown 驱动的 DeepResearch
npm run deepresearch-md
```

## 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **tsx** - TypeScript 执行器
- **@anthropic-ai/claude-agent-sdk** - Claude AI Agent SDK
- **mathjs** - 数学表达式计算库 (basic)
- **zod** - 运行时类型验证 (basic)

## 许可证

MIT
