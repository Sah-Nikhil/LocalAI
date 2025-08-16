# app/services/qdrant_handler.py

import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from qdrant_client.http.models import PointStruct
from qdrant_client.models import Filter, SearchRequest

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

def create_collection_if_not_exists(collection_name: str, vector_size: int):
    existing_collections = [c.name for c in client.get_collections().collections]
    if collection_name not in existing_collections:
        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )

def delete_collection(collection_name: str):
    client.delete_collection(collection_name=collection_name)

def store_vectors(collection_name: str, vectors: list[dict]):
    points = [
        PointStruct(
            id=i,
            vector=item["vector"],
            payload=item["payload"]
        )
        for i, item in enumerate(vectors)
    ]
    client.upsert(collection_name=collection_name, points=points)

def search_vectors(collection_name: str, query_vector: list[float], limit: int = 5):
    search_result = client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=limit,
    )

    return [
        {
            "id": str(point.id),
            "score": point.score,
            "text": point.payload.get("text", "") if point.payload else ""
        }
        for point in search_result
    ]

def get_all_vectors(collection_name: str):
    """Fetches all stored chunks from Qdrant for a conversation/document."""
    scroll_result = client.scroll(
        collection_name=collection_name,
        limit=1000,  # Adjust or paginate if you need more
        with_payload=True
    )
    return [
        point.payload
        for point in scroll_result[0]
        if point.payload and "text" in point.payload
    ]
