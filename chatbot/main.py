from typing import Optional

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import os

from fastapi import HTTPException
from rag.chat import ask_question, debug_catalog

app = FastAPI(title="HotColours RAG Chatbot API", version="2.0.0")

# In production replace "*" with your real frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatIn(BaseModel):
    question: str
    history: list[dict] = Field(default_factory=list)  # [{role, content}]
    admin_session: bool = False  # sent by the frontend; can only REDUCE access


@app.get("/")
def home():
    return {"status": "success", "message": "HotColours RAG Chatbot API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/chat")
def chat(data: ChatIn, authorization: Optional[str] = Header(None)):
    question = data.question.strip()
    if not question:
        return {"answer": "Please enter a question.", "cards": None, "actions": [], "sources": []}

    token = authorization.split(" ", 1)[1] if authorization and " " in authorization else None

    try:
        return ask_question(question, data.history, token=token, admin_session=data.admin_session)
    except Exception as e:
        print("CHAT ERROR:", repr(e))
        return {
            "answer": "Sorry, I couldn't process your question right now.",
            "cards": None,
            "actions": [],
            "sources": [],
        }


@app.get("/debug/catalog")
def debug(q: str = ""):
    """Shows what the bot can see. Set DEBUG_ENDPOINTS=true in .env; remove in production."""
    if os.getenv("DEBUG_ENDPOINTS", "").lower() != "true":
        raise HTTPException(status_code=404, detail="Not found")
    return debug_catalog(q)