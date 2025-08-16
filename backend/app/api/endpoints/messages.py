from fastapi import APIRouter, HTTPException
from app.lib import supabase

router = APIRouter()

@router.get("/session/{chat_id}/messages")
async def get_chat_messages(chat_id: str):
    try:
        sb = supabase.get_client()
        result = sb.table("chat_messages").select("*").eq("chat_id", chat_id).order("timestamp", desc=False).execute()
        if not result.data:
            return {"messages": []}
        # Map each row to two messages: user question and ai answer
        messages = []
        for row in result.data:
            messages.append({"role": "user", "text": row["question"]})
            messages.append({"role": "ai", "text": row["answer"]})
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
