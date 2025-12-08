# DocChat: Document Chat Platform

DocChat is a full-stack application that enables users to upload documents (PDF, Word, PowerPoint, Markdown, Text) and chat with them using AI-powered retrieval and summarization. The platform features persistent chat sessions, document context, and seamless integration between a Next.js frontend and a FastAPI backend, with Supabase and Qdrant for storage and vector search.

---

## Table of Contents
- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Backend: docchat-backend](#backend-docchat-backend)
  - [API Endpoints](#api-endpoints)
  - [Supabase Schema](#supabase-schema)
  - [Qdrant Usage](#qdrant-usage)
  - [Setup & Running](#backend-setup--running)
- [Frontend](#frontend)
  - [Key Components](#key-components)
  - [Session & State Management](#session--state-management)
  - [Setup & Running](#frontend-setup--running)
- [Development & Contribution](#development--contribution)
- [License](#license)

---

## Features
- Upload and process multiple document types (PDF, DOCX, PPTX, TXT, MD)
- Persistent chat sessions and document context (Supabase as source of truth)
- Vector search and retrieval using Qdrant
- AI-powered Q&A and summarization (Ollama, LLMs)
- Visual Language Model (VLM) extracts and summarizes images from documents; image chunks are embedded and stored in the main vector DB alongside text chunks
- Modern, responsive Next.js frontend
- FastAPI backend with clear REST endpoints
- User session management, file sidebar, and chat area

---

## Architecture Overview

```
[User] ⇄ [Next.js Frontend] ⇄ [FastAPI Backend] ⇄ [Supabase, Qdrant, Ollama]
```
- **Frontend:** Next.js (React), TypeScript, modern UI, state/context for chat and session
- **Backend:** FastAPI, Python, REST API, document parsing (including text and images), embedding, and chat logic
- **Storage:** Supabase (metadata, chat, docs, messages), Qdrant (vector DB)
- **AI:** Ollama based compatible LLMs for embeddings and chat
- **VLM:** Visual Language Model extracts and summarizes images from documents; image chunks are embedded and stored in Qdrant alongside text chunks

---

## Backend: docchat-backend

### API Endpoints
- `POST /upload/` — Upload a document (file, user_id); parses, chunks, embeds, stores in Qdrant & Supabase
- `POST /session/chat-session` — Get or create a chat session for a user
- `GET /session/{chat_id}/conversations` — List all uploaded files for a chat (conversation_id, file_name, file_type)
- `GET /session/{chat_id}/messages` — Get all chat messages for a session
- `POST /chat/` — Query chat with one or more documents (chat_id, conversation_ids, query, user_id)
- `DELETE /session/{chat_id}` — Delete a chat session and all associated data

### Supabase Schema
```
-- Chats: One row per session
CREATE TABLE IF NOT EXISTS chats (
  chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Documents: One row per uploaded file, linked to a chat
CREATE TABLE IF NOT EXISTS chat_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL, -- maps to Qdrant collection
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP DEFAULT now(),
  user_id TEXT NOT NULL,
  UNIQUE (conversation_id)
);

-- Messages: One row per Q&A exchange
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_documents_user_id ON chat_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
```

### Qdrant Usage
- Each uploaded document is chunked and embedded; vectors are stored in a Qdrant collection named after `conversation_id`.
- Vector search is used for retrieval-augmented generation (RAG) in chat.

### Backend Setup & Running
1. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
2. Set up `.env` with Supabase and Qdrant credentials.
3. Run the FastAPI server:
   ```sh
   uvicorn app.main:app --reload
   ```

---

## Frontend

### Key Components
- `app-sidebar.tsx` — Sidebar for session management, file list, and navigation
- `chatArea.tsx` — Main chat UI, message display, and input
- `uploadSidebar.tsx` — File upload and processed files list
- `useChatContext.tsx` — React context for chat/session state
- `useChat.ts` — Hooks for chat, upload, and session API calls

### Session & State Management
- Chat session and document context are persisted in Supabase and localStorage
- On reload, frontend restores chatId and document context from backend
- Deleting a session immediately creates a new one for seamless UX

### Frontend Setup & Running
1. Install dependencies:
   ```sh
   pnpm install
   # or npm install
   ```
2. Set up `.env` with backend URL and user ID.
3. Run the Next.js app:
   ```sh
   pnpm dev
   # or npm run dev
   ```

---

## Credits
- Built with Next.js, FastAPI, Supabase, Qdrant, and Ollama
