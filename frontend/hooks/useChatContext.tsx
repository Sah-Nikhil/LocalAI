// app/hooks/useChatContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ChatContextType = {
    chatId: string | null;
    conversationIds: string[];
    setConversationIds: (ids: string[]) => void;
    resetSession: () => void;
};

const ChatContext = createContext<ChatContextType>({
    chatId: null,
    conversationIds: [],
    setConversationIds: () => { },
    resetSession: () => { },
});

interface ChatProviderProps {
    children: React.ReactNode;
    initialChatId?: string;
}

export function ChatProvider({ children, initialChatId }: ChatProviderProps) {
    const [chatId, setChatId] = useState<string | null>(initialChatId || null);
    const [conversationIds, setConversationIds] = useState<string[]>([]);

    // Update chatId if initialChatId changes (e.g., navigating between chats)
    useEffect(() => {
        if (initialChatId) {
            setChatId(initialChatId);
        }
    }, [initialChatId]);

    // Fetch conversationIds from backend when chatId changes
    useEffect(() => {
        if (!chatId) {
            setConversationIds([]);
            return;
        }
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        (async () => {
            try {
                const res = await fetch(`${backendUrl}/session/${chatId}/conversations`, {
                    headers: {
                        "Bypass-Tunnel-Reminder": "true",
                    },
                });
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
