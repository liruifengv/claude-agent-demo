import { tool } from "@anthropic-ai/claude-agent-sdk";

import { z } from "zod"
import { calculator } from "../utils/calculator";

export const calcTool = tool(
  "calculator",
  "Perform a calculation using an expression string. The strings used here are executed using mathjs evaluate function. eg  " + "1.2 * (2 + 4.5)",
  {
    expression: z.string().describe("The expression to be evaluated")
  },
  async (args) =>{
    const result = calculator(args.expression)

    return {
      content: [
        {
          type: "text",
          text: result
        }
      ]
    }
  }
)