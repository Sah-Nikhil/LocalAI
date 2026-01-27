# app/api/endpoints/session.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.lib import supabase
from uuid import uuid4
from typing import Optional

router = APIRouter()


class ChatSessionRequest(BaseModel):
    user_id: str


class ChatCreateRequest(BaseModel):
    user_id: str
    title: Optional[str] = "Untitled Chat"


@router.post("/chat-session")
async def create_chat(request: ChatCreateRequest):
    """
    Creates a NEW chat session for the user.
    Always creates a new entry; does not check for existing ones.
    """
    try:
        sb = supabase.get_client()
        new_chat_id = str(uuid4())
        sb.table("chats").insert({
            "chat_id": new_chat_id,
            "user_id": request.user_id,
            "title": request.title or "Untitled Chat"
        }).execute()
        return {"chat_id": new_chat_id, "title": request.title or "Untitled Chat"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_chats(user_id: str = Query(...)):
    """
    Returns all chat sessions for the given user_id, including associated file metadata.
    """
    try:
        sb = supabase.get_client()
        # Fetch all chats for this user
        chats_res = sb.table("chats").select("chat_id, title, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()

        if not chats_res.data:
            return {"chats": []}

        chats = []
        for chat in chats_res.data:
            chat_id = chat["chat_id"]
            # Fetch first associated document for display
            doc_res = sb.table("chat_documents").select("file_name, file_type").eq("chat_id", chat_id).limit(1).execute()
            file_info = doc_res.data[0] if doc_res.data else None

            chats.append({
                "chat_id": chat_id,
                "title": chat["title"],
                "created_at": chat["created_at"],
                "file_name": file_info["file_name"] if file_info else None,
                "file_type": file_info["file_type"] if file_info else None,
            })

        return {"chats": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
