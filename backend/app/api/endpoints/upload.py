# app/api/endpoints/upload.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from uuid import uuid4
import os
from app.services import document_parser, embedder, qdrant_handler
from app.lib import supabase

router = APIRouter()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        print("🚀 Starting upload...", flush=True)

        # 🔍 Get or create a chat session for this user
        sb = supabase.get_client()
        chat_result = sb.table("chats").select("chat_id").eq("user_id", user_id).limit(1).execute()

        if chat_result.data:
            chat_id = chat_result.data[0]["chat_id"]
            print(f"♻️ Found existing chat_id for user {user_id}: {chat_id}", flush=True)
            # Check and update chat title if it's still 'Untitled Chat'
            chat_row = sb.table("chats").select("title").eq("chat_id", chat_id).limit(1).execute()
            if chat_row.data and chat_row.data[0]["title"] == "Untitled Chat":
                sb.table("chats").update({"title": file.filename}).eq("chat_id", chat_id).execute()
                print(f"✏️ Updated chat title to: {file.filename}", flush=True)
        else:
            chat_id = str(uuid4())
            sb.table("chats").insert({
                "chat_id": chat_id,
                "user_id": user_id,
                "title": file.filename
            }).execute()
            print(f"🆕 Created new chat_id for user {user_id}: {chat_id}", flush=True)

        # 🆔 Generate new conversation ID for this document
        conversation_id = str(uuid4())
        print(f"✅ Generated conversation_id: {conversation_id}", flush=True)

        # 📁 Save file temporarily
        file_ext = os.path.splitext(file.filename)[-1]
        temp_path = os.path.join(UPLOAD_DIR, f"{conversation_id}{file_ext}")
        print(f"📁 Saving to temp path: {temp_path}", flush=True)

        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 📄 Parse and chunk
        print("📄 File saved. Parsing text...", flush=True)
        text = document_parser.extract_text(temp_path)

        print("✂️ Chunking text...", flush=True)
        chunks = document_parser.chunk_text(text, max_tokens=300)
        print(f"🔍 {len(chunks)} chunks created.", flush=True)

        # 🧠 Embed and prepare vectors
        vectors = []
        try:
            for i, chunk in enumerate(chunks):
                try:
                    embedding = embedder.get_embedding(chunk)
                except Exception as embed_error:
                    print(f"❌ Embedding failed for chunk {i}: {embed_error}", flush=True)
                    raise HTTPException(status_code=503, detail="Embedding service (Ollama) is unavailable. Please try again later.")
                vectors.append({
                    "id": f"{conversation_id}-{i}",
                    "vector": embedding,
                    "payload": {
                        "text": chunk,
                        "chunk_index": i,
                        "conversation_id": conversation_id
                    }
                })
        except HTTPException:
            raise
        except Exception as embed_outer_error:
            print(f"❌ Unexpected embedding error: {embed_outer_error}", flush=True)
            raise HTTPException(status_code=500, detail="Unexpected error during embedding.")

        print("💾 Storing vectors in Qdrant...", flush=True)
        qdrant_handler.create_collection_if_not_exists(conversation_id, vector_size=len(vectors[0]["vector"]))
        qdrant_handler.store_vectors(conversation_id, vectors)

        # 🗂️ Log file in Supabase
        try:
            sb.table("chat_documents").insert({
                "chat_id": chat_id,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "file_name": file.filename,
                "file_type": file.content_type
            }).execute()
            print(f"📌 Document logged: {file.filename} to chat {chat_id}", flush=True)
        except Exception as log_error:
            print(f"⚠️ Supabase logging failed: {log_error}", flush=True)

        return {
            "chat_id": chat_id,
            "conversation_id": conversation_id,
            "title": file.filename
        }

    except Exception as e:
        import traceback
        print("❌ Exception during upload:", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
