# MySQL Schema

This document outlines the MySQL database structure for DocChat. It assumes MySQL 8.0+ and InnoDB.

## 1. Initial Table Creation

Run this if you are setting up the project for the first time.

```sql
-- Chats: One row per session
CREATE TABLE IF NOT EXISTS chats (
  chat_id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id VARCHAR(191) NOT NULL,
  title TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Documents: One row per uploaded file, linked to a chat
CREATE TABLE IF NOT EXISTS chat_documents (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  chat_id CHAR(36) DEFAULT NULL,
  conversation_id VARCHAR(191) NOT NULL, -- maps to Qdrant collection
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(191) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_chat_documents_conversation_id (conversation_id),
  KEY idx_chat_documents_user_id (user_id),
  CONSTRAINT fk_chat_documents_chat_id
    FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Messages: One row per Q&A exchange
-- Includes token tracking and model info
CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  chat_id CHAR(36) DEFAULT NULL,
  user_id VARCHAR(191) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Token Statistics
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  reasoning_tokens INT NOT NULL DEFAULT 0,
  context_tokens INT NOT NULL DEFAULT 0,
  history_tokens INT NOT NULL DEFAULT 0,
  query_tokens INT NOT NULL DEFAULT 0,

  -- Model Metadata
  model_used VARCHAR(255),

  PRIMARY KEY (id),
  KEY idx_chat_messages_chat_id (chat_id),
  CONSTRAINT fk_chat_messages_chat_id
    FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

## 2. Migration: Update Existing Tables

If you already have these tables and just need to add the token tracking columns, run this:

```sql
-- Adding token tracking and model info to existing chat_messages table
ALTER TABLE chat_messages
  ADD COLUMN prompt_tokens INT,
  ADD COLUMN completion_tokens INT,
  ADD COLUMN total_tokens INT,
  ADD COLUMN reasoning_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN context_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN history_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN query_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN model_used VARCHAR(255);
```

## 3. Foreign Key Verification

Use this to check that constraints are correctly applied.

```sql
SELECT
  kcu.CONSTRAINT_NAME,
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME,
  rc.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE kcu
JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
  AND kcu.TABLE_NAME IN ('chat_documents', 'chat_messages')
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL;
```
