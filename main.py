import os
import json
import requests

from fastapi import FastAPI
from pydantic import BaseModel
from anthropic import Anthropic
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="AI Internship Memory Assistant"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
OBSIDIAN_API_KEY = os.environ["OBSIDIAN_API_KEY"]

# IMPORTANT:
# This must be your current Cloudflare Tunnel URL.
OBSIDIAN_URL = os.environ["OBSIDIAN_URL"]


anthropic_client = Anthropic(
    api_key=ANTHROPIC_API_KEY
)


class Question(BaseModel):
    question: str


# ============================================================
# OBSIDIAN
# ============================================================

def get_obsidian_notes():

    headers = {
        "Authorization": f"Bearer {OBSIDIAN_API_KEY}"
    }

    response = requests.get(
        f"{OBSIDIAN_URL}/vault/",
        headers=headers,
        timeout=30
    )

    response.raise_for_status()

    return response.json()["files"]


def read_note(note_name):

    headers = {
        "Authorization": f"Bearer {OBSIDIAN_API_KEY}"
    }

    response = requests.get(
        f"{OBSIDIAN_URL}/vault/{note_name}",
        headers=headers,
        timeout=30
    )

    response.raise_for_status()

    return response.text


def get_project_context():

    files = get_obsidian_notes()

    project_files = [
        file
        for file in files
        if file.endswith(".md")
    ]

    context = ""

    for file in project_files:

        try:
            content = read_note(file)

            context += (
                f"\n\n--- {file} ---\n"
            )

            context += content

        except Exception as error:

            print(
                f"Could not read {file}: {error}"
            )

    return context


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "AI Internship Memory Assistant is running"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok"
    }


# ============================================================
# ASK AI
# ============================================================

@app.post("/ask")
def ask_project(question: Question):

    context = get_project_context()

    prompt = f"""
You are an AI Internship Memory Assistant.

Answer the user's question using ONLY the real internship
information stored in the provided Obsidian notes.

Return ONLY valid JSON.

Do not use Markdown.
Do not add ```json.
Do not add any explanation outside the JSON.

Use exactly this structure:

{{
    "answer": "",
    "key_points": [],
    "sources": []
}}

Rules:

- Answer the user's question directly.
- Use only information found in the notes.
- Do not invent information.
- Do not assume something happened if it is not documented.
- If information is unavailable, say that it is not documented
  in the available internship notes.
- Keep the answer professional and concise.
- key_points should contain important supporting points.
- sources must contain exact note filenames.
- Only include sources that support the answer.

REAL INTERNSHIP NOTES:

{context}

USER QUESTION:

{question.question}
"""

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2500,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    raw_result = response.content[0].text.strip()

    try:

        return json.loads(raw_result)

    except json.JSONDecodeError:

        return {
            "answer": raw_result,
            "key_points": [],
            "sources": []
        }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health-check")
def internship_health_check():

    context = get_project_context()

    prompt = f"""
You are an AI Internship Intelligence Assistant.

Analyze the real internship notes below.

Do not invent information.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "summary": {{
        "status": "",
        "project_count": 0,
        "challenge_count": 0,
        "technology_count": 0,
        "overview": ""
    }},

    "projects": [],

    "accomplishments": [],

    "challenges": [],

    "learning": [],

    "current_focus": [],

    "next_steps": []
}}

Rules:

- Use ONLY the internship notes.
- Do not invent projects or challenges.
- Do not invent architectural decisions.
- Do not claim RAG, fine-tuning, SSO, etc. unless documented.
- Sources must contain exact filenames.
- Distinguish completed, in progress, blocked and planned.
- Do not turn missing documentation into a problem.
- Use recent notes for current focus.
- Keep the response concise.

REAL INTERNSHIP NOTES:

{context}
"""

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    raw_result = response.content[0].text.strip()

    try:

        return json.loads(raw_result)

    except json.JSONDecodeError:

        return {
            "error": "Claude returned invalid JSON.",
            "raw_response": raw_result
        }