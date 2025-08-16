// chatpdf/hooks/useChat.ts

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Delete a chat session by chat_id
export async function deleteChatSession(chatId: string) {
  const res = await fetch(`${backendUrl}/session/${chatId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete chat session: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Get or create a chat session for a user
export async function getOrCreateChat(userId: string): Promise<string> {
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

// Upload a file and store it in Supabase + Qdrant
export async function uploadFile(file: File, userId: string, chatId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", userId);
  form.append("chat_id", chatId);

  const res = await fetch(`${backendUrl}/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    conversation_id: data.conversation_id,
    title: data.title,
    chat_id: data.chat_id,
  };
}

// Send a message to the backend and get a grounded LLM response
export async function sendMessage(
  chatId: string,
  conversationIds: string[],
  query: string,
  mode: "full" | "search" = "search"
): Promise<string> {
  const userId = process.env.NEXT_PUBLIC_USER_ID || "fallback_u";
  const res = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      conversation_ids: conversationIds,
      query,
      mode,
      user_id: userId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.answer;
}
