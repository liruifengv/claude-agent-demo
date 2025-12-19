# Claude Agent Basic

基础示例项目，展示 Claude Agent SDK 的核心用法。

## 示例列表

| 示例 | 文件 | 说明 |
|------|------|------|
| 基础示例 | `src/basic-example.ts` | 最简单的 query 调用 |
| 会话示例 | `src/session-example.ts` | Session ID 管理，支持多轮对话 |
| TUI 聊天 | `src/tui-chat.ts` | 终端交互式聊天界面 |
| 带工具的聊天 | `src/tui-chat-with-tools.ts` | 集成 MCP 服务器和计算器工具 |

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

在 `src/index.ts` 中选择要运行的示例：

```typescript
async function main() {
  // await basicExample();        // 基础示例
  // await sessionExample();      // 会话示例
  // await tuiChat();             // TUI 聊天
  await tuiChatWithTools();       // 带工具的 TUI 聊天（默认）
}
```

运行：

```bash
npm run dev
```

## 交互示例

```bash
User: 你好
Assistant: 你好！我是 Claude...

User: 计算 123 * 456
Using tool: mcp__utilities__calculator - Input: 123 * 456
Tool Results: 56088
Assistant: 123 乘以 456 等于 56088。
```

按 `Ctrl+C` 或 `Ctrl+D` 退出。
