// chatpdf/hooks/useChat.ts

export async function getOrCreateChat(userId: string): Promise<string> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${backendUrl}/session/chat-session`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to create or get chat session: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.chat_id;
}

export async function uploadFile(file: File, userId: string, chatId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", userId);
  form.append("chat_id", chatId);

  const res = await fetch("http://localhost:8000/upload", {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  return {
    conversation_id: data.conversation_id,
    title: data.title,
    chat_id: data.chat_id,
  };
}

export async function sendMessage(chatId: string, conversationIds: string[], query: string) {
  const res = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      conversation_ids: conversationIds,
      query,
    }),
  });

  const data = await res.json();
  return data.answer;
}
