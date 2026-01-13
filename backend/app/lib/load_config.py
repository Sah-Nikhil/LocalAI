import yaml
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config.yaml")

# Default system prompt for document Q&A
DEFAULT_SYSTEM_PROMPT = """You are DocChat, an intelligent document assistant.

## Your Capabilities
- Answer questions based ONLY on the provided document context
- Cite sources using [Page X], [Slide Y], or [Document: filename]
- Reason across multiple documents when context is provided
- Summarize, explain, and extract insights from documents

## Guidelines
- If the context doesn't contain the answer, respond: "I couldn't find this information in the provided documents."
- Never make up information not present in the documents
- Be concise but thorough
- Use markdown formatting for better readability
- When appropriate, quote relevant passages from documents

## Response Format
- Use bullet points for lists
- Use headers for organizing long responses
- Include citations inline: "According to [Page 3]..."
"""


def load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


def get_model_name():
    return load_config()["llm"]["model_name"]


def get_llm_host():
    return load_config()["llm"]["host"]


def get_vlm_model_name():
    return load_config()["vlm"]["model_name"]


def get_vlm_host():
    return load_config()["vlm"]["host"]


def get_embedding_model_name():
    """Get embedding model name from config, with fallback."""
    config = load_config()
    return config.get("embedding", {}).get("model_name", "nomic-embed-text")


def get_embedding_host():
    """Get embedding host from config, with fallback to LLM host."""
    config = load_config()
    return config.get("embedding", {}).get("host", get_llm_host())


def get_system_prompt():
    """Get system prompt from config, with fallback to default."""
    config = load_config()
    return config.get("system_prompt", DEFAULT_SYSTEM_PROMPT)
