"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { getAllChats, createChat, ChatSummary, deleteChatSession } from "@/hooks/useChat";
import { ModeToggle } from "@/components/mode-toggle";
import { IconPlus, IconTrash } from "@tabler/icons-react";

export default function Home() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const userId = process.env.NEXT_PUBLIC_USER_ID || "fallback_u";

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const data = await getAllChats(userId);
      setChats(data);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSpace = async () => {
    try {
      setCreating(true);
      // Generate UUID client-side - no backend call, no DB entry yet
      const newChatId = crypto.randomUUID();
      router.push(`/chat/${newChatId}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this space?")) return;
    try {
      await deleteChatSession(chatId);
      setChats((prev) => prev.filter((c) => c.chat_id !== chatId));
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Map chats to HoverEffect items
  const items = chats.map((chat) => ({
    title: chat.title || "Untitled Chat",
    description: `${chat.file_name ? `📄 ${chat.file_name}` : "No files yet"} • ${formatDate(chat.created_at)}`,
    link: `/chat/${chat.chat_id}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Spaces</h1>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <button
              onClick={handleNewSpace}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconPlus size={18} />
              {creating ? "Creating..." : "New Space"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg mb-4">No spaces yet. Start by creating one!</p>
            <button
              onClick={handleNewSpace}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
            >
              <IconPlus size={20} />
              Create Your First Space
            </button>
          </div>
        ) : (
          <div className="relative">
            <HoverEffect items={items} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
            {/* Delete buttons overlay - positioned over each card */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10">
              {chats.map((chat) => (
                <div key={chat.chat_id} className="relative p-2 h-full w-full">
                  <button
                    onClick={(e) => handleDeleteChat(chat.chat_id, e)}
                    className="absolute top-6 right-6 z-30 pointer-events-auto p-2 rounded-full bg-red-500/10 hover:bg-red-500/30 text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Space"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
