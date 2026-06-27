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
    // Don't register a new click if the background is fading out
    if (bgFading) return;

    // Not the last chat in the current conversation => advance to the next chat
    if (!isLastChat) {
      setChatIndex(i => i + 1);
      return;
    }
    
    // Last chat in the last conversation => complete
    if (isLastConv) {
      onComplete();
      return;
    }

    // Last chat in the not last conversation => advance to the next conversation
    const nextConvIndex = convIndex + 1;
    const nextConv = conversations[nextConvIndex];
    const isBgChanged = nextConv?.backgroundUrl !== currentConv?.backgroundUrl ||
      nextConv?.backgroundColor !== currentConv?.backgroundColor;

    // If the background didn't change, just jump to the next conversation directly
    if (!isBgChanged) {
      jumpToConversation(nextConvIndex);
      return;
    }

    // If the background changed, store the next conversation index and start fading the background
    // After that, expect to jump to the next conversation via onBgFadeOutEnd
    pendingConvIndex.current = nextConvIndex;
    setBgFading(true);
  };

  const onBgFadeOutEnd = () => {
    if (pendingConvIndex.current !== null) {
      jumpToConversation(pendingConvIndex.current);
      pendingConvIndex.current = null;
      setBgFading(false);
    }
  };

  const jumpToConversation = (convIndex: number) => {
    setConvIndex(convIndex);
    setChatIndex(0);
  };

  return { currentConv, current, isVeryLast, advance, bgFading, onBgFadeOutEnd };
}
