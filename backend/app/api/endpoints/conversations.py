# app/api/endpoints/conversations.py
from fastapi import APIRouter, HTTPException
from app.lib import supabase

router = APIRouter()


@router.get("/session/{chat_id}/conversations")
async def get_conversation_ids(chat_id: str):
    """
    Returns a list of uploaded files for the chat, each with conversation_id, file_name, and file_type.
    """
    try:
        sb = supabase.get_client()
        result = sb.table("chat_documents").select("conversation_id,file_name,file_type").eq("chat_id", chat_id).execute()
        if not result.data:
            return {"files": []}
        files = [
            {
                "conversation_id": doc["conversation_id"],
                "file_name": doc.get("file_name", "Unknown"),
                "file_type": doc.get("file_type", "Unknown")
            }
            for doc in result.data
        ]
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
