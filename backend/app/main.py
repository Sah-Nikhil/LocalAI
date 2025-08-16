# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import upload, chat, session, delete_session, conversations, messages

from dotenv import load_dotenv
load_dotenv()



app = FastAPI(title="DocChat Local Backend")

# Allow CORS for local frontend and production (add your deployed URL as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your deployed frontend URL here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(session.router, prefix="/session", tags=["Session"])
app.include_router(delete_session.router, prefix="/session", tags=["Session"])
app.include_router(conversations.router, tags=["Conversations"])
app.include_router(messages.router, tags=["Messages"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
