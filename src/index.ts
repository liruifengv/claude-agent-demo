import { basicExample } from './core/basic-example';
import { sessionExample } from './core/session-example';
import { tuiChat } from './core/tui-chat';
import { tuiChatWithTools } from './core/tui-chat-with-tools';

async function main() {
  console.log('Starting Claude Agent Demo...');

  // await basicExample();
  // await sessionExample();
  // await tuiChat();
  await tuiChatWithTools();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
