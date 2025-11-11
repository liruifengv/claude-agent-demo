import readline from "node:readline";
import {query, Query} from "@anthropic-ai/claude-agent-sdk";
import { utilitiesServer } from "../mcps/mcp-example-server";

export async function tuiChat() {
  let sessionId: string | undefined

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'User: '
  })

  rl.prompt()

  rl.on('line', async (input: string) => {
    const userInput = input.trim()
    sessionId = await chatExample(userInput, sessionId)

    rl.prompt()
  })


  rl.on('close', () => {
    console.log("exit the chat")
    process.exit(0);
  });

}

export async function chatExample(prompt: string, sessionId: string | undefined) {

  let _sessionId: string | undefined

  const result: Query = query({
    prompt: prompt,
    options: {
      resume: sessionId,
    }
  })
  for await (const message of result) {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          _sessionId = message.session_id
        }
        break
      case 'assistant':
        for (const msg of message.message.content) {
          if (msg.type === "text") {
            console.log(`Assistant: ${msg.text}`)
          } 
        }
        break
    }
  }

  return _sessionId

}