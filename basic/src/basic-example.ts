import { query, Query } from "@anthropic-ai/claude-agent-sdk";

export async function basicExample() {
    const result: Query = query({prompt: "你好"})

    for await (const message of result){
      switch (message.type){
        case 'assistant':
          for (const msg of message.message.content) {
            if (msg.type === "text") {
              console.log(msg.text)
            }
          }
      }
    }
  
  }