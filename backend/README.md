# DocChat Backend

The backend of DocChat is a FastAPI application responsible for document processing, retrieval-augmented generation (RAG) logic, and interfacing with AI services (Ollama) and databases (Supabase, Qdrant).

---

## Features

- **Asynchronous Processing**: Uses FastAPI's async capabilities for non-blocking API endpoints.
- **Robust Document Parsing**: Supports PDF, DOCX, PPTX, TXT, and MD files.
- **Visual Intelligence**: Integrated VLM support for interpreting images and diagrams within documents.
- **Vectorized Search**: Efficient document retrieval using Qdrant.
- **Session Management**: Persistent storage of conversations and metadata in Supabase.
- **Token Analytics**: Precise tracking of prompt, completion, and reasoning tokens.

---

## File Parsing Libraries

| Package       | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `pymupdf`     | High-performance PDF parsing and image extraction.     |
| `pypdf`       | Secondary PDF text extraction.                         |
| `python-docx` | Extracts text from `.docx` (Microsoft Word) documents. |
| `python-pptx` | Extracts text from `.pptx` (PowerPoint) files.         |
| `lxml`        | Fast XML parsing backend for document libraries.       |
| `pillow`      | Image processing and support for VLM tasks.            |

---

## Configuration

The backend uses a combination of environment variables and a YAML configuration file.

### 1. Infrastructure (`.env`)

Create a `.env` file in the `backend` directory with the following:

- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_KEY`: Your Supabase service role key.
- `QDRANT_HOST`: Host for the Qdrant database (default: `localhost`).
- `QDRANT_PORT`: Port for the Qdrant database (default: `6333`).

### 2. AI Models (`config.yaml`)

`config.yaml` defines the default models used for generation and embeddings. These serve as fallbacks if no model is selected in the UI.

```yaml
llm:
  model_name: llama3.2:latest
  host: http://localhost:11434
vlm:
  model_name: qwen2.5vl:3b
  host: http://localhost:11434
embedding:
  model_name: nomic-embed-text
```

---

## Setup & Running

1. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at [http://localhost:8000](http://localhost:8000).

---

## API Documentation

Once the server is running, you can access the interactive API docs at:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
