from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Optional

import requests


class DocChatError(RuntimeError):
    pass


@dataclass
class DocChatClient:
    backend_url: str
    user_id: str
    timeout: float = 30.0
    session: requests.Session = field(default_factory=requests.Session)

    @classmethod
    def from_env(cls) -> "DocChatClient":
        backend_url = (
            os.getenv("DOCCHAT_BACKEND_URL")
            or os.getenv("NEXT_PUBLIC_BACKEND_URL")
            or "http://localhost:8000"
        ).rstrip("/")
        user_id = (
            os.getenv("DOCCHAT_USER_ID")
            or os.getenv("NEXT_PUBLIC_USER_ID")
            or "fallback_u"
        )
        return cls(backend_url=backend_url, user_id=user_id)

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict[str, Any]] = None,
        json: Optional[dict[str, Any]] = None,
        data: Optional[dict[str, Any]] = None,
        files: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
    ) -> requests.Response:
        url = f"{self.backend_url}{path}"
        request_headers = {"Bypass-Tunnel-Reminder": "true"}
        if headers:
            request_headers.update(headers)

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                data=data,
                files=files,
                headers=request_headers,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise DocChatError(f"Backend request failed: {method} {path}") from exc

        if not response.ok:
            raise DocChatError(self._extract_error(response, method, path))

        return response

    @staticmethod
    def _extract_error(response: requests.Response, method: str, path: str) -> str:
        try:
            payload = response.json()
        except ValueError:
            text = response.text.strip()
            detail = text or f"HTTP {response.status_code}"
        else:
            if isinstance(payload, dict):
                detail = payload.get("detail") or payload.get("error") or str(payload)
            else:
                detail = str(payload)
        return f"{method} {path} failed: {detail}"

    def list_chats(self, user_id: Optional[str] = None) -> list[dict[str, Any]]:
        response = self._request("GET", "/session/list", params={"user_id": user_id or self.user_id})
        return list(response.json().get("chats", []))

    def create_chat(self, user_id: Optional[str] = None, title: str = "Untitled Chat") -> dict[str, Any]:
        response = self._request(
            "POST",
            "/session/chat-session",
            json={"user_id": user_id or self.user_id, "title": title},
        )
        return response.json()

    def delete_chat(self, chat_id: str) -> dict[str, Any]:
        return self._request("DELETE", f"/session/{chat_id}").json()

    def upload_file(self, file_storage: Any, chat_id: str, user_id: Optional[str] = None) -> dict[str, Any]:
        stream = file_storage.stream
        stream.seek(0)
        response = self._request(
            "POST",
            "/upload",
            data={"user_id": user_id or self.user_id, "chat_id": chat_id},
            files={
                "file": (
                    file_storage.filename,
                    stream,
                    file_storage.mimetype or "application/octet-stream",
                )
            },
        )
        return response.json()

    def send_message(
        self,
        chat_id: str,
        conversation_ids: list[str],
        query: str,
        mode: str = "search",
        model: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "conversation_ids": conversation_ids,
            "query": query,
            "mode": mode,
            "user_id": user_id or self.user_id,
        }
        if model:
            payload["model"] = model
        return self._request("POST", "/chat", json=payload).json()

    def fetch_messages(self, chat_id: str) -> list[dict[str, Any]]:
        response = self._request("GET", f"/session/{chat_id}/messages")
        return list(response.json().get("messages", []))

    def fetch_conversations(self, chat_id: str) -> list[dict[str, Any]]:
        response = self._request("GET", f"/session/{chat_id}/conversations")
        return list(response.json().get("files", []))

    def fetch_models(self) -> dict[str, Any]:
        return self._request("GET", "/models").json()

    def fetch_health(self) -> dict[str, Any]:
        return self._request("GET", "/models/health").json()
