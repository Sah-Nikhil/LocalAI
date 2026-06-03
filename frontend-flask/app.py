from __future__ import annotations

import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, abort, flash, jsonify, redirect, render_template, request, url_for

from docchat_client import DocChatClient, DocChatError

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY") or "docchat-dev-secret"

logger = logging.getLogger(__name__)
client = DocChatClient.from_env()


@app.template_filter("display_date")
def display_date(value: object) -> str:
    if not value:
        return "Unknown"
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%b %d, %Y")
        except ValueError:
            return value
    return str(value)


def safe_call(func, fallback):
    try:
        return func(), None
    except DocChatError as exc:
        logger.warning("%s", exc)
        return fallback, str(exc)


def load_chat_list():
    return safe_call(lambda: client.list_chats(), [])


def load_chat_state(chat_id: str):
    chats, chats_error = load_chat_list()
    messages, messages_error = safe_call(lambda: client.fetch_messages(chat_id), [])
    files, files_error = safe_call(lambda: client.fetch_conversations(chat_id), [])
    models, models_error = safe_call(
        lambda: client.fetch_models(),
        {
            "configured": {"llm": {"configured": ""}, "vlm": {"configured": ""}, "embedding": {"configured": ""}},
            "available": {"llm": [], "vlm": [], "embedding": []},
        },
    )
    health, health_error = safe_call(lambda: client.fetch_health(), {})
    errors = [item for item in [chats_error, messages_error, files_error, models_error, health_error] if item]
    return {
        "chats": chats,
        "messages": messages,
        "files": files,
        "models": models,
        "health": health,
        "errors": errors,
    }


@app.get("/")
def index():
    chats, backend_error = load_chat_list()
    return render_template(
        "index.html",
        page_name="home",
        title="DocChat | Spaces",
        user_id=client.user_id,
        chats=chats,
        backend_error=backend_error,
    )


@app.post("/chats/new")
def create_chat():
    try:
        chat = client.create_chat()
    except DocChatError as exc:
        flash(str(exc), "error")
        return redirect(url_for("index"))
    return redirect(url_for("chat_page", chat_id=chat["chat_id"]))


@app.post("/chats/<chat_id>/delete")
def delete_chat(chat_id: str):
    try:
        client.delete_chat(chat_id)
    except DocChatError as exc:
        flash(str(exc), "error")
    return redirect(url_for("index"))


@app.get("/chat/<chat_id>")
def chat_page(chat_id: str):
    state = load_chat_state(chat_id)
    return render_template(
        "chat.html",
        page_name="chat",
        title="DocChat | Chat",
        user_id=client.user_id,
        active_chat_id=chat_id,
        chat_id=chat_id,
        chats=state["chats"],
        messages=state["messages"],
        files=state["files"],
        models=state["models"],
        health=state["health"],
        backend_errors=state["errors"],
        initial_state={
            "chat_id": chat_id,
            "messages": state["messages"],
            "files": state["files"],
            "models": state["models"],
            "health": state["health"],
            "user_id": client.user_id,
        },
    )


@app.post("/api/session/chat-session")
def api_create_chat():
    payload = request.get_json(silent=True) or {}
    try:
        result = client.create_chat(payload.get("user_id"), payload.get("title") or "Untitled Chat")
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)


@app.get("/api/session/list")
def api_list_chats():
    try:
        chats = client.list_chats(request.args.get("user_id") or client.user_id)
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify({"chats": chats})


@app.get("/api/session/<chat_id>/messages")
def api_messages(chat_id: str):
    try:
        messages = client.fetch_messages(chat_id)
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify({"messages": messages})


@app.get("/api/session/<chat_id>/conversations")
def api_conversations(chat_id: str):
    try:
        files = client.fetch_conversations(chat_id)
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify({"files": files})


@app.delete("/api/session/<chat_id>")
def api_delete_chat(chat_id: str):
    try:
        result = client.delete_chat(chat_id)
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)


@app.post("/api/upload")
def api_upload():
    file_storage = request.files.get("file")
    chat_id = request.form.get("chat_id")
    user_id = request.form.get("user_id") or client.user_id
    if not file_storage or not chat_id:
        abort(400, description="Missing file or chat_id")
    try:
        result = client.upload_file(file_storage, chat_id=chat_id, user_id=user_id)
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)


@app.post("/api/chat")
def api_chat():
    payload = request.get_json(silent=True) or {}
    chat_id = payload.get("chat_id")
    query = payload.get("query")
    if not chat_id or not query:
        abort(400, description="Missing chat_id or query")
    try:
        result = client.send_message(
            chat_id=chat_id,
            conversation_ids=payload.get("conversation_ids") or [],
            query=query,
            mode=payload.get("mode", "search"),
            model=payload.get("model"),
            user_id=payload.get("user_id") or client.user_id,
        )
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)


@app.get("/api/models")
def api_models():
    try:
        result = client.fetch_models()
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)


@app.get("/api/models/health")
def api_health():
    try:
        result = client.fetch_health()
    except DocChatError as exc:
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)


@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": error.description}), 400


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", "3000"))
    app.run(host="127.0.0.1", port=port, debug=True)
