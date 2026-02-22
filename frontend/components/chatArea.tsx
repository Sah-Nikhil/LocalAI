// components/MainChatArea.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { sendMessage, type TokenStats } from "@/hooks/useChat";
import { useChatContext } from "@/hooks/useChatContext";
import { Send, Zap } from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";

interface Message {
    role: "user" | "ai";
    text: string;
    tokens?: TokenStats;
    model?: string;
}

export default function MainChatArea() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [showTokenStats, setShowTokenStats] = useState(true);
    const [expandedTokens, setExpandedTokens] = useState<Set<number>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Use chatId and conversationIds from context
    const { chatId, conversationIds } = useChatContext();

    // Helper to extract and log reasoning
    const processMessageText = (text: string): string => {
        let result = text;

        // 1. Handle orphan </think> tag (e.g., Satyr model starting with reasoning but missing <think>)
        const firstOpen = text.indexOf("<think>");
        const firstClose = text.indexOf("</think>");

        if (firstClose !== -1 && (firstOpen === -1 || firstClose < firstOpen)) {
            const reasoning = text.substring(0, firstClose).trim();
            if (reasoning) {
                console.log("🧠 Model Reasoning (Orphan):", reasoning);
            }
            result = text.substring(firstClose + 8); // Remove the orphan </think> tag
        }

        // 2. Handle standard or unclosed blocks: <think>...</think> or <think>... (EOF)
        const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
        return result
            .replace(thinkRegex, (match, content) => {
                if (content.trim()) {
                    console.log("🧠 Model Reasoning:", content.trim());
                }
                return "";
            })
            .trim();
    };

    // Fetch previous messages if chatId exists (on reload)
    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }
        // Fetch previous messages from backend
        (async () => {
            try {
                const backendUrl =
                    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
                const res = await fetch(`${backendUrl}/session/${chatId}/messages`, {
                    headers: {
                        "Bypass-Tunnel-Reminder": "true",
                    },
                });
                if (!res.ok) throw new Error("Failed to fetch messages");
                const data = await res.json();
                // Expecting data.messages: [{role: 'user'|'ai', text: string}]
                const loadedMessages = (data.messages || []).map((msg: Message) => ({
                    ...msg,
                    text: msg.role === "ai" ? processMessageText(msg.text) : msg.text,
                }));
                setMessages(loadedMessages);
            } catch (err) {
                setMessages([]);
            }
        })();
    }, [chatId]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            if (!chatId) throw new Error("No chatId available");
            const response = await sendMessage(
                chatId,
                conversationIds,
                input,
                "search",
                selectedModel || undefined,
            );

            if (response.error) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text: `⚠️ ${response.error}`,
                    },
                ]);
            } else {
                const cleanedAnswer = processMessageText(response.answer);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text: cleanedAnswer,
                        tokens: response.tokens,
                        model: response.model_used,
                    },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { role: "ai", text: "⚠️ Failed to get response." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format token count summary
    const formatTokensSummary = (tokens: TokenStats) => {
        if (!tokens.total_tokens) return "";

        if (tokens.reasoning_tokens && tokens.reasoning_tokens > 0) {
            const responseTokens = tokens.completion_tokens - tokens.reasoning_tokens;
            return `${tokens.total_tokens} tokens (prompt: ${tokens.prompt_tokens} • reasoning: ${tokens.reasoning_tokens} • response: ${responseTokens})`;
        }
        return `${tokens.total_tokens} tokens (prompt: ${tokens.prompt_tokens} • response: ${tokens.completion_tokens})`;
    };

    // Toggle breakdown expansion for a specific message
    const toggleTokenBreakdown = (idx: number) => {
        setExpandedTokens((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) {
                newSet.delete(idx);
            } else {
                newSet.add(idx);
            }
            return newSet;
        });
    };

    return (
        <div className="relative flex flex-col h-full bg-background/50">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto w-full h-full p-4 pt-3 pb-36 space-y-4 scroll-smooth">
                {messages.length === 0 && (
                    <div className="dark:bg-accent/50 bg-accent/75 p-6 rounded-2xl max-w-md mx-auto mt-10 text-muted-foreground flex justify-center shadow-md ">
                        <p>Hello! Upload a document and ask your question.</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className="space-y-1">
                        <div
                            className={`p-4 rounded-2xl max-w-[60%] leading-relaxed animate-in fade-in slide-in-from-bottom-2 w-fit break-words whitespace-pre-wrap ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground ml-auto rounded-tr-none shadow-sm"
                                    : "bg-accent/50 dark:bg-accent/75 text-foreground rounded-tl-none shadow-sm"
                                }`}
                        >
                            {msg.text}
                        </div>
                        {/* Token stats footer for AI messages */}
                        {msg.role === "ai" && msg.tokens?.total_tokens && showTokenStats && (
                            <div className="ml-1 animate-in fade-in">
                                <button
                                    onClick={() => toggleTokenBreakdown(idx)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Zap className="h-3 w-3" />
                                    <span>{formatTokensSummary(msg.tokens)}</span>
                                    {msg.model && (
                                        <span className="text-muted-foreground/60">
                                            • {msg.model}
                                        </span>
                                    )}
                                    <svg
                                        className={`h-3 w-3 transition-transform ${expandedTokens.has(idx) ? "rotate-180" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>

                                {/* Expanded breakdown */}
                                {expandedTokens.has(idx) && (
                                    <div className="mt-2 ml-5 text-xs text-muted-foreground/80 space-y-0.5 animate-in fade-in slide-in-from-top-1">
                                        {msg.tokens.context_tokens !== undefined &&
                                            msg.tokens.context_tokens > 0 && (
                                                <div>
                                                    📄 Context: {msg.tokens.context_tokens} tokens
                                                </div>
                                            )}
                                        {msg.tokens.history_tokens !== undefined &&
                                            msg.tokens.history_tokens > 0 && (
                                                <div>
                                                    💬 History: {msg.tokens.history_tokens} tokens
                                                </div>
                                            )}
                                        {msg.tokens.query_tokens !== undefined &&
                                            msg.tokens.query_tokens > 0 && (
                                                <div>❓ Query: {msg.tokens.query_tokens} tokens</div>
                                            )}
                                        {msg.tokens.reasoning_tokens !== undefined &&
                                            msg.tokens.reasoning_tokens > 0 && (
                                                <div>
                                                    🧠 Reasoning: {msg.tokens.reasoning_tokens} tokens
                                                </div>
                                            )}
                                        <div>
                                            💭 Response:{" "}
                                            {msg.tokens.reasoning_tokens &&
                                                msg.tokens.reasoning_tokens > 0
                                                ? msg.tokens.completion_tokens -
                                                msg.tokens.reasoning_tokens
                                                : msg.tokens.completion_tokens}{" "}
                                            tokens
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                <div className="w-full max-w-4xl flex flex-col gap-2">
                    {/* Model selector and token toggle row */}
                    <div className="flex items-center justify-between px-2">
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={setSelectedModel}
                            disabled={loading}
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Show tokens</span>
                            <Switch
                                checked={showTokenStats}
                                onCheckedChange={setShowTokenStats}
                                className="scale-75"
                            />
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="w-full flex gap-3 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-2xl rounded-3xl pl-6 pr-2 items-center ring-1 ring-border/50">
                        <textarea
                            placeholder="Type a message..."
                            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none py-3 text-base resize-none min-h-[24px] max-h-[150px] outline-none"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleEnter}
                            disabled={loading}
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
                            }}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="rounded-full h-10 w-10 p-0 shrink-0 shadow-sm transition-transform active:scale-95"
                            size="icon"
                        >
                            <Send className="-ml-0.5" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
