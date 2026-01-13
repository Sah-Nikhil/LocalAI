# app/api/endpoints/chat.py
"""
Chat endpoint with improved system prompts, model selection, token counting,
and async Ollama client integration.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services import qdrant_handler
from app.services.ollama_client import get_client, OllamaError
from app.lib.load_config import (
    get_model_name, get_llm_host, get_embedding_model_name,
    get_embedding_host, get_system_prompt
)
from app.lib.supabase import get_client as get_supabase_client
from os import getenv
import tiktoken
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter()


def count_tokens(text: str, model: str = "gpt-4") -> int:
    """
    Count tokens in text using tiktoken.
    Falls back to word-based approximation if encoding not available.
    """
    try:
        # Use cl100k_base encoding (works for most modern models)
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        # Fallback: approximate 1 token ≈ 4 characters
        return len(text) // 4


class ChatRequest(BaseModel):
    chat_id: str
    conversation_ids: List[str]
    query: str
    mode: str = "search"  # "full" or "search"
    user_id: str
    model: Optional[str] = None  # Optional model override


class TokenStats(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    reasoning_tokens: int = 0


class ChatResponse(BaseModel):
    answer: str
    tokens: Optional[TokenStats] = None
    model_used: Optional[str] = None
    error: Optional[str] = None


async def get_embedding_async(text: str) -> List[float]:
    """Get embeddings using async Ollama client."""
    host = get_embedding_host()
    model = get_embedding_model_name()
    client = get_client(host)
    return await client.embed(model, text)


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Chat with one or more documents using either full-context or top-K retrieval.
    Supports model selection and returns token statistics.
    """
    try:
        logger.info(f"💬 User Query: {request.query}")
        USER_ID = request.user_id or getenv("USER_ID", "fallback_u")
        supabase_client = get_supabase_client()

        # Determine which model to use
        model_to_use = request.model or get_model_name()
        llm_host = get_llm_host()

        logger.info(f"🤖 Using model: {model_to_use}")

        # Gather context from documents
        context_chunks = []
        for cid in request.conversation_ids:
            if request.mode == "search":
                logger.info(f"🔍 Vector search in: {cid}")
                try:
                    query_embedding = await get_embedding_async(request.query)
                except OllamaError as embed_err:
                    logger.error(f"❌ Embedding service error: {embed_err}")
                    return ChatResponse(
                        answer="",
                        error="Embedding service unavailable. Please ensure Ollama is running."
                    )
                results = qdrant_handler.search_vectors(
                    collection_name=cid,
                    query_vector=query_embedding,
                    limit=5
                )
                context_chunks.extend(chunk["text"] for chunk in results)
            else:
                logger.info(f"📚 Full context from: {cid}")
                all_data = qdrant_handler.get_all_vectors(cid)
                context_chunks.extend(chunk["text"] for chunk in all_data if "text" in chunk)

        if not context_chunks:
            return ChatResponse(
                answer="⚠️ No content found in the document(s).",
                model_used=model_to_use
            )

        context_text = "\n\n".join(context_chunks)

        # Fetch chat history
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

        # Use improved system prompt
        system_instruction = get_system_prompt()

        prompt = f"""{system_instruction}

--- Start of Document Context ---
{context_text}
--- End of Context ---

--- Conversation History ---
{history_block}User: {request.query}
Assistant:"""

        # Count prompt tokens
        prompt_tokens = count_tokens(prompt)
        logger.info(f"📊 Prompt tokens: {prompt_tokens}")

        # Call LLM using async client with retry logic
        logger.info("🧠 Sending prompt to LLM...")
        try:
            ollama_client = get_client(llm_host)
            result = await ollama_client.generate(
                model=model_to_use,
                prompt=prompt,
                stream=False
            )
            llm_response = result.get("response", "").strip()
            logger.info("✅ LLM response received.")
        except OllamaError as llm_err:
            logger.error(f"❌ LLM service error: {llm_err}")
            return ChatResponse(
                answer="",
                error=f"LLM service unavailable: {str(llm_err)}"
            )

        # Count completion tokens
        completion_tokens = count_tokens(llm_response)

        # Calculate reasoning tokens
        reasoning_tokens = 0
        think_matches = re.findall(r'<think>(.*?)</think>', llm_response, re.DOTALL)
        for match in think_matches:
            reasoning_tokens += count_tokens(match)

        total_tokens = prompt_tokens + completion_tokens

        # Log chat into Supabase
        try:
            supabase_client.table("chat_messages").insert({
                "chat_id": request.chat_id,
                "user_id": USER_ID,
                "question": request.query,
                "answer": llm_response
            }).execute()
        except Exception as log_err:
            logger.warning(f"⚠️ Failed to log message to Supabase: {log_err}")

        return ChatResponse(
            answer=llm_response,
            tokens=TokenStats(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                reasoning_tokens=reasoning_tokens
            ),
            model_used=model_to_use
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(answer="", error=str(e))
