# DocChat Flask Frontend

This package contains the Flask-based frontend for DocChat. It provides a lightweight web UI for managing chat spaces, uploading documents, selecting models, and chatting with the existing DocChat backend.

## Features

- **Spaces dashboard** for creating, viewing, and deleting chat sessions
- **Document upload** with queued file selection and processing
- **Chat interface** with token details and message history
- **Model selection** for text and vision models
- **Theme toggle** with saved light/dark preference
- **Backend status display** with inline error handling when API calls fail

## Technology

- **Framework:** Flask
- **HTTP client:** Requests
- **Environment loading:** python-dotenv
- **Frontend:** Server-rendered Jinja templates, vanilla JavaScript, and CSS

## Prerequisites

- Python 3.10+
- A running DocChat backend

## Configuration

Create a `.env` file in `frontend-flask/` with the values you want to use:

```env
DOCCHAT_BACKEND_URL=http://localhost:8000
DOCCHAT_USER_ID=fallback_u
FLASK_SECRET_KEY=your-secret-key
PORT=3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DOCCHAT_BACKEND_URL` | Base URL of the DocChat backend API |
| `DOCCHAT_USER_ID` | Default user ID used when one is not provided |
| `FLASK_SECRET_KEY` | Flask session secret used for flash messages |
| `PORT` | Local port for the Flask app |

The app also accepts the backend variables used by the Next.js frontend:

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_USER_ID`

## Setup

```bash
cd frontend-flask
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

By default the app runs on `http://127.0.0.1:3000`.

## Backend API usage

The frontend calls these backend endpoints:

- `POST /session/chat-session`
- `GET /session/list`
- `GET /session/{chat_id}/messages`
- `GET /session/{chat_id}/conversations`
- `DELETE /session/{chat_id}`
- `POST /upload`
- `POST /chat`
- `GET /models`
- `GET /models/health`

## UI overview

- **Home page:** lists spaces and lets you create or delete a space
- **Chat page:** shows messages, uploaded files, model controls, and the message composer
- **Uploads panel:** lets you queue files before sending them to the backend

