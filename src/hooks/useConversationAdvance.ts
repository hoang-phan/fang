import { useState, useRef } from 'react';
import type { Conversation } from '../types';

export function useConversationAdvance(conversations: Conversation[], onComplete: () => void) {
  const [convIndex, setConvIndex] = useState(0);
  const [chatIndex, setChatIndex] = useState(0);
  const [bgFading, setBgFading] = useState(false);
  const pendingConvIndex = useRef<number | null>(null);

  const currentConv = conversations[Math.min(convIndex, conversations.length - 1)];
  const chats = currentConv?.chats ?? [];
  const current = chats[Math.min(chatIndex, chats.length - 1)];
  const isLastChat = chatIndex >= chats.length - 1;
  const isLastConv = convIndex >= conversations.length - 1;
  const isVeryLast = isLastChat && isLastConv;

  const advance = () => {
    if (!isLastChat) {
      setChatIndex(i => i + 1);
    } else if (!isLastConv) {
      const nextConvIndex = convIndex + 1;
      const nextConv = conversations[nextConvIndex];
      const bgChanges = nextConv?.backgroundUrl !== currentConv?.backgroundUrl ||
        nextConv?.backgroundColor !== currentConv?.backgroundColor;

      if (bgChanges) {
        pendingConvIndex.current = nextConvIndex;
        setBgFading(true);
      } else {
        setConvIndex(nextConvIndex);
        setChatIndex(0);
      }
    } else {
      onComplete();
    }
  };

  const onBgFadeOutEnd = () => {
    if (pendingConvIndex.current !== null) {
      setConvIndex(pendingConvIndex.current);
      setChatIndex(0);
      pendingConvIndex.current = null;
      setBgFading(false);
    }
  };

  return { currentConv, current, isVeryLast, advance, bgFading, onBgFadeOutEnd };
}
