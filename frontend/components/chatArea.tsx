// components/MainChatArea.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/hooks/useChat"; // Make sure the path matches
import { useChatContext } from "@/hooks/useChatContext";
import { Send } from "lucide-react";

export default function MainChatArea() {
    const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Use chatId and conversationIds from context
    const { chatId, conversationIds } = useChatContext();

    // Fetch previous messages if chatId exists (on reload)
    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }
        // Fetch previous messages from backend
        (async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
                const res = await fetch(`${backendUrl}/session/${chatId}/messages`);
                if (!res.ok) throw new Error("Failed to fetch messages");
                const data = await res.json();
                // Expecting data.messages: [{role: 'user'|'ai', text: string}]
                setMessages(data.messages || []);
            } catch (err) {
                setMessages([]);
            }
        })();
    }, [chatId]);

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
    <div className="relative flex flex-col h-full bg-background/50">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto w-full h-full p-4 pt-3 pb-28 space-y-4 scroll-smooth">
            {messages.length === 0 && (
            <div className="bg-muted/50 p-6 rounded-2xl max-w-md mx-auto mt-10 text-muted-foreground">
                <p>Hello! Upload a document and ask your question.</p>
            </div>
            )}
            {messages.map((msg, idx) => (
            <div
                key={idx}
                className={`p-4 rounded-2xl max-w-[80%] leading-relaxed animate-in fade-in slide-in-from-bottom-2 w-fit break-words ${
                msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto rounded-tr-sm shadow-sm"
                    : "bg-muted text-foreground rounded-tl-sm shadow-sm"
                }`}
            >
                {msg.text}
            </div>
            ))}
            {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2 animate-pulse">
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span>Thinking...</span>
            </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Floating Message Input */}
        <div className="absolute bottom-6 left-0 right-0 px-6 sm:px-12 flex justify-center z-20">
            <div className="w-full max-w-4xl flex gap-3 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-2xl rounded-full pl-6 pr-2 items-center ring-1 ring-border/50">
                <Input
                    placeholder="Type a message..."
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none py-6 text-base"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleEnter}
                    disabled={loading}
                />
                <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="rounded-full h-10 w-10 p-0 shrink-0 shadow-sm transition-transform active:scale-95 "
                    size="icon"
                >
                    <Send className="-ml-0.5"/>
                    {/* <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                    >
                        <path d="m5 12 7-7 7 7" />
                        <path d="M12 19V5" />
                    </svg> */}
                    <span className="sr-only">Send</span>
                </Button>
            </div>
        </div>
    </div>
    );
}
