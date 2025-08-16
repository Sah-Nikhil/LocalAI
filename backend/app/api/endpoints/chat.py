# app/api/endpoints/chat.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services import embedder, qdrant_handler
from app.lib.load_config import get_model_name, get_llm_host
import requests
from app.lib.supabase import get_client
from os import getenv

router = APIRouter()

class ChatRequest(BaseModel):
    chat_id: str
    conversation_ids: List[str]
    query: str
    mode: str = "full"  # "full" or "search"
    user_id: str

@router.post("/")
async def chat(request: ChatRequest):
    """
    Chat with one or more documents using either full-context or top-K retrieval.
    """
    try:
        print(f"💬 User Query: {request.query}", flush=True)
        USER_ID = request.user_id or getenv("USER_ID", "fallback_u")
        supabase_client = get_client()

        context_chunks = []
        for cid in request.conversation_ids:
            if request.mode == "search":
                print(f"🔍 Vector search in: {cid}", flush=True)
                try:
                    query_embedding = embedder.get_embedding(request.query)
                except Exception as embed_err:
                    print(f"❌ Embedding service error: {embed_err}", flush=True)
                    return {"error": "Embedding service unavailable. Please ensure Ollama is running."}
                results = qdrant_handler.search_vectors(
                    collection_name=cid,
                    query_vector=query_embedding,
                    limit=5
                )
                context_chunks.extend(chunk["text"] for chunk in results)
            else:
                print(f"📚 Full context from: {cid}", flush=True)
                all_data = qdrant_handler.get_all_vectors(cid)
                context_chunks.extend(chunk["text"] for chunk in all_data if "text" in chunk)

        if not context_chunks:
            return {"answer": "⚠️ No content found in the document(s)."}

        context_text = "\n\n".join(context_chunks)

        # 🕓 Fetch chat history
        history_resp = supabase_client.table("chat_messages") \
            .select("question,answer") \
            .eq("chat_id", request.chat_id) \
            .order("timestamp", desc=False) \
            .limit(10) \
            .execute()

        history_messages = history_resp.data if history_resp.data else []
        history_block = ""
        for msg in history_messages:
            history_block += f"User: {msg['question']}\nAssistant: {msg['answer']}\n"

        system_instruction = (
            "You are an AI assistant. Your task is to answer user questions based on the provided document context and conversation history.\n"
            "You may reason over the context and provide insights, suggestions, or summaries.\n"
            "However, do NOT answer questions unrelated to the documents.\n"
            "If the context does not contain enough information, say: 'I don't know'.\n"
            "Always cite sources using [Page X], [Slide Y], or similar if applicable."
        )

        prompt = f"""{system_instruction}

--- Start of Document Context ---
{context_text}
--- End of Context ---

--- Conversation History ---
{history_block}User: {request.query}
Assistant:"""

        print("🧠 Sending prompt to LLM...", flush=True)
        try:
            response = requests.post(
                f"{get_llm_host()}/api/generate",
                json={
                    "model": get_model_name(),
                    "prompt": prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            llm_response = response.json().get("response", "").strip()
            print("✅ LLM response received.", flush=True)
        except Exception as llm_err:
            print(f"❌ LLM service error: {llm_err}", flush=True)
            return {"error": "LLM service unavailable. Please ensure Ollama is running."}

        # Log chat into Supabase
        try:
            supabase_client.table("chat_messages").insert({
                "chat_id": request.chat_id,
                "user_id": USER_ID,
                "question": request.query,
                "answer": llm_response
            }).execute()
        except Exception as log_err:
            print(f"⚠️ Failed to log message to Supabase: {log_err}", flush=True)

        return {"answer": llm_response}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
