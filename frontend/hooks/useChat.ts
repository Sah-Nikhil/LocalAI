// hooks/useChat.ts
/**
 * Chat hooks for communicating with the DocChat backend.
 * Includes model management and health checks.
 */

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Types
export interface TokenStats {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens?: number;
}

export interface ChatResponse {
  answer: string;
  tokens?: TokenStats;
  model_used?: string;
  error?: string;
}

export interface ModelInfo {
  name: string;
  size: number;
  modified_at: string;
  family: string;
}

export interface ModelsResponse {
  configured: {
    llm: { configured: string; host: string };
    vlm: { configured: string; host: string };
    embedding: { configured: string; host: string };
  };
  available: {
    llm: ModelInfo[];
    vlm: ModelInfo[];
    embedding: ModelInfo[];
  };
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    ollama: { status: string; models?: ModelInfo[]; error?: string };
    qdrant: { status: string; collections_count?: number; error?: string };
  };
}

// Chat list item
export interface ChatSummary {
  chat_id: string;
  title: string;
  created_at: string;
  file_name: string | null;
  file_type: string | null;
}

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

// Create a NEW chat session for a user
export async function createChat(userId: string, title?: string): Promise<{ chat_id: string; title: string }> {
  const res = await fetch(`${backendUrl}/session/chat-session`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, title: title || "Untitled Chat" }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to create chat session: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Get all chats for a user
export async function getAllChats(userId: string): Promise<ChatSummary[]> {
  const res = await fetch(`${backendUrl}/session/list?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    throw new Error(`Failed to get chats: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.chats || [];
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
  mode: "full" | "search" = "search",
  model?: string
): Promise<ChatResponse> {
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
      model: model || undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.status} ${res.statusText}`);
  }

  const data: ChatResponse = await res.json();
  return data;
}

// Fetch available models from the backend
export async function fetchAvailableModels(): Promise<ModelsResponse> {
  const res = await fetch(`${backendUrl}/models`);
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Check health status of backend services
export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${backendUrl}/models/health`);
  if (!res.ok) {
    throw new Error(`Failed to check health: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}
