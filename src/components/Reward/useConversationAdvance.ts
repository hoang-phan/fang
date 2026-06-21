import { useState } from 'react';
import type { Conversation } from '../../types';

export function useConversationAdvance(conversations: Conversation[], onComplete: () => void) {
  const [convIndex, setConvIndex] = useState(0);
  const [chatIndex, setChatIndex] = useState(0);

  const currentConv = conversations[Math.min(convIndex, conversations.length - 1)];
  const chats = currentConv?.chats ?? [];
  const current = chats[Math.min(chatIndex, chats.length - 1)];
  const isLastChat = chatIndex === chats.length - 1;
  const isLastConv = convIndex === conversations.length - 1;
  const isVeryLast = isLastChat && isLastConv;

  const advance = () => {
    if (!isLastChat) {
      setChatIndex(i => i + 1);
    } else if (!isLastConv) {
      setConvIndex(i => i + 1);
      setChatIndex(0);
    } else {
      onComplete();
    }
  };

  return { currentConv, current, isVeryLast, advance };
}
