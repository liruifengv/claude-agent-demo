import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { calcTool } from "../tools/calc-tool";

export const utilitiesServer = createSdkMcpServer({
  name: "utilities",
  version: "1.0.0",
  tools: [calcTool],
})