// app/hooks/useChatContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateChat } from "./useChat"; // already implemented


type ChatContextType = {
  chatId: string | null;
  conversationIds: string[];
  setConversationIds: (ids: string[]) => void;
  resetSession: () => void;
};

const ChatContext = createContext<ChatContextType>({
  chatId: null,
  conversationIds: [],
  setConversationIds: () => {},
  resetSession: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [conversationIds, setConversationIds] = useState<string[]>([]);

  useEffect(() => {
    const userId = process.env.NEXT_PUBLIC_USER_ID || "testu1";
    getOrCreateChat(userId)
      .then(setChatId)
      .catch((err) => console.error("❌ Failed to get chat ID:", err));
  }, []);

  // Reset all session state after deletion
  const resetSession = () => {
    setChatId(null);
    setConversationIds([]);
  };

  return (
    <ChatContext.Provider value={{ chatId, conversationIds, setConversationIds, resetSession }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
