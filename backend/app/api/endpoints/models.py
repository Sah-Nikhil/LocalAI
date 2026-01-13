# app/api/endpoints/models.py
"""
API endpoints for model management and health checks.
"""

from fastapi import APIRouter
from typing import Dict, List, Any
from app.lib.load_config import load_config
from app.services.ollama_client import get_client
from qdrant_client import QdrantClient
import os

router = APIRouter()

def is_vision_model(model_name: str, details: Dict[str, Any]) -> bool:
    """Determine if a model is a vision model based on name and details."""
    name_lower = model_name.lower()
    families = details.get("families", []) or []
    if isinstance(families, str):
        families = [families]

    # Check known vision terms in name
    if any(x in name_lower for x in ["llava", "vision", "moondream", "bakllava", "mmn", "minicpm-v", "vl"]):
        return True

    # Check families for vision-related tags
    if any(x in families for x in ["clip", "vision", "qwen25vl"]):
        return True

    return False

def is_embedding_model(model_name: str, details: Dict[str, Any]) -> bool:
    """Determine if a model is an embedding model."""
    name_lower = model_name.lower()
    families = details.get("families", []) or []
    if isinstance(families, str):
        families = [families]

    if "embed" in name_lower or "bert" in name_lower:
        return True

    if "bert" in families or "nomic-bert" in families:
        return True

    return False

@router.get("/")
async def list_available_models() -> Dict[str, Any]:
    """
    List all available models from Ollama and config.
    Returns models grouped by category (llm, vlm, embedding).
    """
    config = load_config()

    # Get configured models
    configured = {
        "llm": {
            "configured": config.get("llm", {}).get("model_name", ""),
            "host": config.get("llm", {}).get("host", "http://localhost:11434")
        },
        "vlm": {
            "configured": config.get("vlm", {}).get("model_name", ""),
            "host": config.get("vlm", {}).get("host", "http://localhost:11434")
        },
        "embedding": {
            "configured": config.get("embedding", {}).get("model_name", "nomic-embed-text"),
            "host": config.get("embedding", {}).get("host", "http://localhost:11434")
        }
    }

    # Get all models from Ollama
    llm_host = configured["llm"]["host"]
    client = get_client(llm_host)

    categorized = {
        "llm": [],
        "vlm": [],
        "embedding": []
    }

    try:
        ollama_models = await client.list_models()

        for m in ollama_models:
            name = m.get("name", "")
            details = m.get("details", {})
            size = m.get("size", 0)
            modified_at = m.get("modified_at", "")
            family = details.get("family", "unknown")

            model_info = {
                "name": name,
                "size": size,
                "modified_at": modified_at,
                "family": family
            }

            is_vision = is_vision_model(name, details)
            is_embedding = is_embedding_model(name, details)

            if is_vision:
                categorized["vlm"].append(model_info)

            if is_embedding:
                categorized["embedding"].append(model_info)

            # Most models (except purely embedding/visual) are LLMs
            # If it's not an embedding model, we treat it as an LLM
            # This allows multimodal models to appear in both LLM and VLM tabs
            if not is_embedding:
                categorized["llm"].append(model_info)

    except Exception as e:
        print(f"Error listing models: {e}")

    return {
        "configured": configured,
        "available": categorized  # Changed from flat list to categorized dict
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Check health status of all services (Ollama, Qdrant).
    """
    config = load_config()

    # Check Ollama
    llm_host = config.get("llm", {}).get("host", "http://localhost:11434")
    ollama_client = get_client(llm_host)
    ollama_health = await ollama_client.health_check()

    # Check Qdrant
    qdrant_host = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))

    try:
        qdrant_client = QdrantClient(host=qdrant_host, port=qdrant_port)
        qdrant_collections = qdrant_client.get_collections()
        qdrant_status = {
            "status": "healthy",
            "collections_count": len(qdrant_collections.collections)
        }
    except Exception as e:
        qdrant_status = {"status": "unhealthy", "error": str(e)}

    # Overall status
    all_healthy = (
        ollama_health.get("status") == "healthy" and
        qdrant_status.get("status") == "healthy"
    )

    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": {
            "ollama": ollama_health,
            "qdrant": qdrant_status
        }
    }
