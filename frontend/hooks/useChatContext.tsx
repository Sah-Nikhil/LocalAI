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
  // Fetch conversationIds from backend when chatId changes
  useEffect(() => {
    if (!chatId) {
      setConversationIds([]);
      return;
    }
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    (async () => {
      try {
        const res = await fetch(`${backendUrl}/session/${chatId}/conversations`);
        if (!res.ok) throw new Error("Failed to fetch conversationIds");
        const data = await res.json();
        // Expecting data.files: { conversation_id: string, ... }[]
        if (Array.isArray(data.files)) {
          setConversationIds(data.files.map((f: any) => f.conversation_id));
        } else {
          setConversationIds([]);
        }
      } catch (err) {
        setConversationIds([]);
      }
    })();
  }, [chatId]);

  useEffect(() => {
    const userId = process.env.NEXT_PUBLIC_USER_ID || "fallback_u";
    // 1. Use localStorage for instant UI
    const storedChatId = typeof window !== 'undefined' ? localStorage.getItem("chatId") : null;
    if (storedChatId) setChatId(storedChatId);

    // 2. Always fetch latest chatId from backend for sync
    const fetchChatId = async () => {
      try {
        const id = await getOrCreateChat(userId);
        setChatId(id);
        if (typeof window !== 'undefined') localStorage.setItem("chatId", id);
      } catch (err) {
        console.error("❌ Failed to get chat ID:", err);
      }
    };
    fetchChatId();
  }, []);

  // Keep chatId in localStorage in sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (chatId) {
      localStorage.setItem("chatId", chatId);
    } else {
      localStorage.removeItem("chatId");
    }
  }, [chatId]);

  // Reset all session state after deletion
  const resetSession = () => {
    setChatId(null);
    setConversationIds([]);
    if (typeof window !== 'undefined') localStorage.removeItem("chatId");
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
