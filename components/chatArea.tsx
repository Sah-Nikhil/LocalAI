// components/MainChatArea.tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/hooks/useChat"; // Make sure the path matches
import { useChatContext } from "@/hooks/useChatContext";

export default function MainChatArea() {
    const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    // Use chatId and conversationIds from context
    const { chatId, conversationIds } = useChatContext();

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user" as const, text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
        if (!chatId) throw new Error("No chatId available");
        const aiResponse = await sendMessage(chatId, conversationIds, input);
        setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
        } catch (error) {
        setMessages((prev) => [...prev, { role: "ai", text: "⚠️ Failed to get response." }]);
        } finally {
        setLoading(false);
        }
    };

    const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSend();
    };

    return (
        <div className="flex flex-col justify-between h-full p-4">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-2">
            {messages.length === 0 && (
            <div className="bg-muted p-3 rounded-xl max-w-md">
                Hello! Upload a document and ask your question.
            </div>
            )}
            {messages.map((msg, idx) => (
            <div
                key={idx}
                className={`p-3 rounded-xl max-w-lg ${
                msg.role === "user" ? "bg-accent-foreground text-background ml-auto" : "bg-muted"
                }`}
            >
                {msg.text}
            </div>
            ))}
            {loading && (
            <div className="italic text-sm text-muted-foreground">Thinking...</div>
            )}
        </div>

        {/* Message input */}
        <div className="flex gap-2 mt-4">
            <Input
            placeholder="Type your message..."
            className="flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleEnter}
            disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
            Send
            </Button>
        </div>
        </div>
    );
}
