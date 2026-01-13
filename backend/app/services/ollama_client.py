# app/services/ollama_client.py
"""
Async Ollama client with retry logic, health checks, and proper error handling.
"""

import httpx
import asyncio
from typing import Optional, List, Dict, Any
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_TIMEOUT = 120.0  # seconds
DEFAULT_RETRIES = 3
RETRY_DELAYS = [1.0, 2.0, 4.0]  # Exponential backoff delays


class OllamaError(Exception):
    """Base exception for Ollama client errors."""
    pass


class OllamaConnectionError(OllamaError):
    """Raised when unable to connect to Ollama."""
    pass


class OllamaTimeoutError(OllamaError):
    """Raised when Ollama request times out."""
    pass


class OllamaClient:
    """Async Ollama client with retry logic and health checks."""

    def __init__(
        self,
        host: str = "http://localhost:11434",
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_RETRIES
    ):
        self.host = host.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout, connect=10.0)
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _request_with_retry(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict] = None,
        retries: Optional[int] = None
    ) -> Dict[str, Any]:
        """Make a request with retry logic and exponential backoff."""
        retries = retries if retries is not None else self.max_retries
        last_error = None

        for attempt in range(retries):
            try:
                client = await self._get_client()
                url = f"{self.host}{endpoint}"

                if method.upper() == "GET":
                    response = await client.get(url)
                else:
                    response = await client.post(url, json=json_data)

                response.raise_for_status()
                return response.json()

            except httpx.ConnectError as e:
                last_error = OllamaConnectionError(
                    f"Failed to connect to Ollama at {self.host}: {e}"
                )
                logger.warning(f"Connection attempt {attempt + 1}/{retries} failed: {e}")

            except httpx.TimeoutException as e:
                last_error = OllamaTimeoutError(
                    f"Request to Ollama timed out after {self.timeout}s: {e}"
                )
                logger.warning(f"Timeout on attempt {attempt + 1}/{retries}: {e}")

            except httpx.HTTPStatusError as e:
                last_error = OllamaError(
                    f"Ollama returned error {e.response.status_code}: {e.response.text}"
                )
                logger.warning(f"HTTP error on attempt {attempt + 1}/{retries}: {e}")

            except Exception as e:
                last_error = OllamaError(f"Unexpected error: {e}")
                logger.warning(f"Unexpected error on attempt {attempt + 1}/{retries}: {e}")

            # Wait before retrying (except on last attempt)
            if attempt < retries - 1:
                delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                logger.info(f"Retrying in {delay}s...")
                await asyncio.sleep(delay)

        raise last_error

    async def health_check(self) -> Dict[str, Any]:
        """Check if Ollama is running and responsive."""
        try:
            client = await self._get_client()
            response = await client.get(f"{self.host}/api/tags", timeout=5.0)
            response.raise_for_status()
            return {"status": "healthy", "models": response.json().get("models", [])}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    async def list_models(self) -> List[Dict[str, Any]]:
        """List all available models from Ollama."""
        try:
            result = await self._request_with_retry("GET", "/api/tags", retries=1)
            return result.get("models", [])
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    async def generate(
        self,
        model: str,
        prompt: str,
        stream: bool = False,
        options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate a response from the LLM."""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        if options:
            payload["options"] = options

        logger.info(f"🧠 Generating response with model: {model}")
        result = await self._request_with_retry("POST", "/api/generate", payload)
        logger.info("✅ LLM response received")
        return result

    async def embed(self, model: str, text: str) -> List[float]:
        """Generate embeddings for text."""
        payload = {
            "model": model,
            "prompt": text
        }

        result = await self._request_with_retry("POST", "/api/embeddings", payload)
        return result.get("embedding", [])

    async def generate_with_images(
        self,
        model: str,
        prompt: str,
        images: List[str],  # Base64 encoded images
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate a response from a vision model with images."""
        payload = {
            "model": model,
            "prompt": prompt,
            "images": images,
            "stream": stream
        }

        logger.info(f"🖼️ Generating VLM response with model: {model}")
        result = await self._request_with_retry("POST", "/api/generate", payload)
        return result


# Singleton instances for different hosts
_clients: Dict[str, OllamaClient] = {}


def get_client(host: str = "http://localhost:11434") -> OllamaClient:
    """Get or create an OllamaClient for the given host."""
    if host not in _clients:
        _clients[host] = OllamaClient(host=host)
    return _clients[host]


async def cleanup_clients():
    """Close all client connections."""
    for client in _clients.values():
        await client.close()
    _clients.clear()
