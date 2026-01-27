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
        # Use a JOIN to fetch chats with their documents in a single query
        # This avoids the N+1 query problem
        chats_res = sb.table("chats").select(
            "chat_id, title, created_at, chat_documents(file_name, file_type)"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()

        if not chats_res.data:
            return {"chats": []}

        chats = []
        for chat in chats_res.data:
            chat_id = chat["chat_id"]
            # chat_documents is now an array from the JOIN
            documents = chat.get("chat_documents", [])
            # Get the first document if available
            file_info = documents[0] if documents else None

            chats.append({
                "chat_id": chat_id,
                "title": chat["title"],
                "created_at": chat["created_at"],
                "file_name": file_info["file_name"] if file_info else None,
                "file_type": file_info["file_type"] if file_info else None,
            })

        return {"chats": chats}
    except Exception as e:
        # Add detailed logging to help debug the 500 error
        print(f"Error fetching chats for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
