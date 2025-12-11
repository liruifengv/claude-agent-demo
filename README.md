# Claude Agent Demo

一个基于 [Claude Agent SDK](https://docs.claude.com/en/docs/agent-sdk/overview) 的 Node.js + TypeScript 演示项目，展示如何使用 Claude Agent SDK 开发 AI Agent。

## 功能特性

本项目包含 4 个核心示例，从简单到复杂逐步展示 Claude Agent SDK 的使用：

- **基础示例** (`basic-example.ts`) - 最简单的 query 调用示例
- **会话示例** (`session-example.ts`) - session ID 管理
- **TUI 聊天** (`tui-chat.ts`) - 终端交互式聊天界面
- **带工具的 TUI 聊天** (`tui-chat-with-tools.ts`) - 集成 MCP 服务器和计算器工具的聊天

### DeepResearch Agent

一个多 Agent 协作的研究系统，位于 `src/research-agent/`：

```
Lead Agent (协调者) ──┬──▶ Researcher ×N (研究员)
                     │      使用 WebSearch 搜索
                     │      保存到 files/research_notes/
                     │
                     └──▶ Report-Writer (报告编写)
                            读取研究笔记
                            生成报告到 files/reports/
```

运行方式：

```bash
npx tsx src/research-agent/agent.ts
```

详细文档见 [src/research-agent/README.md](src/research-agent/README.md)

## 环境要求

- Node.js 18+
- Anthropic API Key

### 配置 API Key

在项目根目录创建 `.env` 文件：

```bash
ANTHROPIC_BASE_URL=ANTHROPIC_BASE_URL
ANTHROPIC_API_KEY=ANTHROPIC_API_KEY
```

或者在系统的环境变量里配置。

可以使用 [aihubmix](https://aihubmix.com/?aff=uTxe) 获取 API Key。

## 安装

```bash
npm install
```

## 使用方法

### 切换不同示例

在 `src/index.ts` 中，取消注释你想运行的示例：

```typescript
async function main() {
  console.log('Starting Claude Agent Demo...');

  // await basicExample();        // 基础示例
  // await sessionExample();       // 会话示例
  // await tuiChat();              // TUI 聊天
  await tuiChatWithTools();        // 带工具的 TUI 聊天（默认）
}
```

### 运行项目

开发模式：

```bash
npm run dev
```

### 使用交互式聊天

运行 `tuiChat()` 或 `tuiChatWithTools()` 后，可以在终端中直接输入消息与 Claude 对话：

```bash
User: 你好
Assistant: 你好！我是 Claude...

User: 计算 123 * 456
Using tool: mcp__utilities__calculator - Input: 123 * 456
Tool Results: 56088
Assistant: 123 乘以 456 等于 56088。
```

按 `Ctrl+C` 或 `Ctrl+D` 退出聊天。

## 开发

编译 TypeScript：

```bash
npm run build
```

运行编译后的代码：

```bash
npm start
```

## 项目结构

```
claude-agent-demo/
├── src/
│   ├── core/                          # 核心示例
│   │   ├── basic-example.ts           # 基础 query 调用
│   │   ├── session-example.ts         # 会话管理示例
│   │   ├── tui-chat.ts                # 终端聊天界面
│   │   └── tui-chat-with-tools.ts     # 带工具的聊天界面
│   ├── mcps/                          # MCP 服务器定义
│   │   └── mcp-example-server.ts      # utilities 服务器（包含计算器工具）
│   ├── tools/                         # 工具定义
│   │   └── calc-tool.ts               # 计算器工具
│   ├── utils/                         # 工具函数
│   │   └── calculator.ts              # 计算器实现
│   └── index.ts                       # 入口文件
├── dist/                              # 编译输出
├── tsconfig.json                      # TypeScript 配置
└── package.json                       # 项目依赖和脚本
```

## 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **tsx** - TypeScript 执行器
- **@anthropic-ai/claude-agent-sdk** - Claude AI Agent SDK
- **mathjs** - 数学表达式计算库
- **zod** - 运行时类型验证

## 许可证

MIT
