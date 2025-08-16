# app/api/endpoints/delete_session.py

from fastapi import APIRouter, HTTPException
from app.services import qdrant_handler
from app.lib import supabase
import os

router = APIRouter()

UPLOAD_DIR = "temp_uploads"

@router.delete("/{chat_id}")
async def delete_session(chat_id: str):
    try:
        print(f"🗑️ Deleting chat session: {chat_id}", flush=True)
        sb = supabase.get_client()

        # 🔍 Get all associated conversation_ids from Supabase
        result = sb.table("chat_documents").select("conversation_id").eq("chat_id", chat_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Chat session not found")

        conversation_ids = [doc["conversation_id"] for doc in result.data]

        # 🧠 Delete from Qdrant
        for cid in conversation_ids:
            print(f"🧨 Dropping Qdrant collection: {cid}")
            qdrant_handler.delete_collection(cid)

            # 🧹 Delete corresponding file from disk
            for file in os.listdir(UPLOAD_DIR):
                if file.startswith(cid):
                    file_path = os.path.join(UPLOAD_DIR, file)
                    print(f"🗑️ Removing file: {file_path}")
                    os.remove(file_path)

        # 🗃️ Delete rows from Supabase (chat_documents, chat_messages, chats)
        sb.table("chats").delete().eq("chat_id", chat_id).execute()
        print(f"✅ Chat {chat_id} deleted successfully.")

        return {"status": "success", "message": f"Chat {chat_id} and associated data deleted."}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
