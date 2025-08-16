# app/api/endpoints/session.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.lib import supabase
from uuid import uuid4

router = APIRouter()

class ChatSessionRequest(BaseModel):
    user_id: str

@router.post("/chat-session")
async def get_or_create_chat(request: ChatSessionRequest):
    try:
        sb = supabase.get_client()
        res = sb.table("chats").select("chat_id").eq("user_id", request.user_id).limit(1).execute()
        if res.data:
            return {"chat_id": res.data[0]["chat_id"]}

        new_chat_id = str(uuid4())
        sb.table("chats").insert({
            "chat_id": new_chat_id,
            "user_id": request.user_id,
            "title": "Untitled Chat"
        }).execute()
        return {"chat_id": new_chat_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
