# Supabase Schema

This document outlines the database structure for DocChat. You can copy and paste the SQL block below into your Supabase SQL Editor to set up or update your tables.

## 1. Initial Table Creation

Run this if you are setting up the project for the first time.

```sql
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

  UNIQUE (conversation_id) -- ensure only one document per Qdrant collection
);

-- Messages: One row per Q&A exchange
-- Includes token tracking and model info
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT now(),

  -- Token Statistics
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  reasoning_tokens INTEGER DEFAULT 0,
  context_tokens INTEGER DEFAULT 0,
  history_tokens INTEGER DEFAULT 0,
  query_tokens INTEGER DEFAULT 0,

  -- Model Metadata
  model_used TEXT
);

-- Indexes (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_chat_documents_user_id ON chat_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
```

## 2. Migration: Update Existing Tables

If you already have these tables and just need to add the token tracking columns, run this:

```sql
-- Adding token tracking and model info to existing chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS reasoning_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS context_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS history_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS query_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_used TEXT;
```

## 3. Foreign Key Verification

Use this to check that constraints are correctly applied.

```sql
SELECT
    conname,
    confdeltype,
    conrelid::regclass AS table,
    a.attname AS column
FROM
    pg_constraint c
JOIN
    pg_class t ON c.confrelid = t.oid
JOIN
    pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE
    contype = 'f'
    AND conrelid::regclass::text IN ('chat_documents', 'chat_messages');
```
