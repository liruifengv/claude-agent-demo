import { basicExample } from './basic-example';
import { sessionExample } from './session-example';
import { tuiChat } from './tui-chat';
import { tuiChatWithTools } from './tui-chat-with-tools';

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
