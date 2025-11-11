import {query, Query} from "@anthropic-ai/claude-agent-sdk";

export async function sessionExample() {
    let sessionId: string | undefined

    const result: Query = query({
      prompt: "你好",
      options: {
          resume: sessionId
      }
  })

  for await (const message of result) {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          sessionId = message.session_id
          console.log(`Current Session ID: ${sessionId}`)
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
}