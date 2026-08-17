import os
import json
import re
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from anthropic import Anthropic


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="AI Internship Memory Assistant",
    version="1.0.0"
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

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OBSIDIAN_API_KEY = os.environ.get("OBSIDIAN_API_KEY")
OBSIDIAN_URL = os.environ.get("OBSIDIAN_URL")


# ============================================================
# CLIENT
# ============================================================

anthropic_client = None

if ANTHROPIC_API_KEY:
    anthropic_client = Anthropic(
        api_key=ANTHROPIC_API_KEY
    )


# ============================================================
# MODELS
# ============================================================

class Question(BaseModel):
    question: str


# ============================================================
# CONFIGURATION CHECK
# ============================================================

def check_configuration():

    missing = []

    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")

    if not OBSIDIAN_API_KEY:
        missing.append("OBSIDIAN_API_KEY")

    if not OBSIDIAN_URL:
        missing.append("OBSIDIAN_URL")

    return missing


# ============================================================
# OBSIDIAN
# ============================================================

def obsidian_headers():

    return {
        "Authorization": f"Bearer {OBSIDIAN_API_KEY}",
        "Accept": "application/json"
    }


def get_obsidian_notes():

    if not OBSIDIAN_URL:
        raise RuntimeError("OBSIDIAN_URL is not configured.")

    url = f"{OBSIDIAN_URL.rstrip('/')}/vault/"

    response = requests.get(
        url,
        headers=obsidian_headers(),
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    return data.get("files", [])


def read_note(note_name):

    if not OBSIDIAN_URL:
        raise RuntimeError("OBSIDIAN_URL is not configured.")

    # Obsidian Local REST API expects the vault path.
    # URL encoding is handled by requests through this URL.
    url = f"{OBSIDIAN_URL.rstrip('/')}/vault/{note_name}"

    response = requests.get(
        url,
        headers=obsidian_headers(),
        timeout=30
    )

    response.raise_for_status()

    return response.text


def get_project_context():

    files = get_obsidian_notes()

    project_files = [
        file
        for file in files
        if file.lower().endswith(".md")
    ]

    context_parts = []

    for file in project_files:

        try:

            content = read_note(file)

            context_parts.append(
                f"\n\n--- {file} ---\n{content}"
            )

        except Exception as error:

            print(
                f"Could not read {file}: {error}"
            )

    return "".join(context_parts)


# ============================================================
# JSON HELPERS
# ============================================================

def clean_claude_json(raw_text):

    """
    Converts Claude's response into JSON.

    Handles:
    - ```json ... ```
    - ``` ... ```
    - leading/trailing text
    """

    if not raw_text:
        raise ValueError("Claude returned an empty response.")

    text = raw_text.strip()

    # Remove markdown code fences
    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    text = text.strip()

    # Find first JSON object
    start = text.find("{")

    # Find last JSON object
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError(
            "No valid JSON object found in Claude response."
        )

    json_text = text[start:end + 1]

    return json.loads(json_text)


def safe_json_response(raw_text):

    """
    Try to parse Claude response.
    """

    try:

        return clean_claude_json(raw_text)

    except Exception as error:

        print(
            "Claude JSON parsing failed:",
            error
        )

        return None


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "AI Internship Memory Assistant is running",
        "docs": "/docs",
        "health": "/health",
        "health_check": "/health-check"
    }


# ============================================================
# BASIC HEALTH
# ============================================================

@app.get("/health")
def health():

    missing = check_configuration()

    return {
        "status": "ok" if not missing else "configuration_error",
        "obsidian_configured": bool(OBSIDIAN_API_KEY and OBSIDIAN_URL),
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "missing_variables": missing
    }


# ============================================================
# ASK AI
# ============================================================

@app.post("/ask")
def ask_project(question: Question):

    if not question.question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    missing = check_configuration()

    if missing:

        raise HTTPException(
            status_code=500,
            detail=f"Missing environment variables: {', '.join(missing)}"
        )

    try:

        context = get_project_context()

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to read Obsidian notes: {str(error)}"
        )

    prompt = f"""
You are an AI Internship Memory Assistant.

Answer the user's question using ONLY the real internship
information stored in the provided Obsidian notes.

Return ONLY valid JSON.

IMPORTANT:
- Do NOT use Markdown.
- Do NOT use ```json.
- Do NOT use code fences.
- Do NOT add any text before or after the JSON.
- Make sure the JSON is complete and valid.

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
- If information is unavailable, say:
  "This is not documented in the available internship notes."
- Keep the answer professional and concise.
- key_points must be an array of strings.
- sources must be an array of exact note filenames.
- Only include sources that support the answer.

REAL INTERNSHIP NOTES:

{context}

USER QUESTION:

{question.question}
"""

    try:

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Claude API error: {str(error)}"
        )

    raw_result = response.content[0].text.strip()

    parsed = safe_json_response(raw_result)

    if parsed is not None:

        return parsed

    # Fallback instead of crashing
    return {
        "answer": raw_result,
        "key_points": [],
        "sources": []
    }


# ============================================================
# HEALTH CHECK / INTERNSHIP ANALYSIS
# ============================================================

@app.get("/health-check")
def internship_health_check():

    missing = check_configuration()

    if missing:

        raise HTTPException(
            status_code=500,
            detail=f"Missing environment variables: {', '.join(missing)}"
        )

    try:

        context = get_project_context()

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to read Obsidian notes: {str(error)}"
        )

    prompt = f"""
You are an AI Internship Intelligence Assistant.

Analyze the real internship notes below.

Use ONLY information documented in the notes.

Do not invent information.

Return ONLY valid JSON.

VERY IMPORTANT:
- Do NOT use Markdown.
- Do NOT use ```json.
- Do NOT use code fences.
- Do NOT add explanations outside the JSON.
- Make the response COMPLETE valid JSON.
- Keep every description concise.
- Do not repeat unnecessary information.

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

PROJECT OBJECT FORMAT:

{{
    "name": "",
    "status": "",
    "description": "",
    "sources": []
}}

ACCOMPLISHMENT OBJECT FORMAT:

{{
    "description": "",
    "sources": []
}}

CHALLENGE OBJECT FORMAT:

{{
    "title": "",
    "description": "",
    "status": "",
    "sources": []
}}

LEARNING OBJECT FORMAT:

{{
    "area": "",
    "description": "",
    "sources": []
}}

CURRENT FOCUS OBJECT FORMAT:

{{
    "focus": "",
    "source": ""
}}

NEXT STEP OBJECT FORMAT:

{{
    "step": "",
    "source": ""
}}

RULES:

- Use ONLY the internship notes.
- Do not invent projects.
- Do not invent challenges.
- Do not invent technologies.
- Do not claim RAG, fine-tuning, SSO, etc. unless documented.
- Sources must contain exact filenames.
- Distinguish completed, in progress, blocked and planned.
- Do not turn missing documentation into a problem.
- Use recent notes for current focus.
- Keep the response concise.
- project_count must equal the number of projects returned.
- challenge_count must equal the number of challenges returned.
- technology_count should represent documented technologies.
- If there are no documented next steps, return [].
- Make sure the JSON ends correctly and is valid.

REAL INTERNSHIP NOTES:

{context}
"""

    try:

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=6000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Claude API error: {str(error)}"
        )

    raw_result = response.content[0].text.strip()

    parsed = safe_json_response(raw_result)

    if parsed is not None:

        return parsed

    # If Claude returned invalid JSON, return useful information
    # instead of exposing a huge broken response.
    return {
        "error": "Claude returned invalid JSON.",
        "message": "The internship notes were successfully read, but the AI analysis response was not valid JSON. Please click Re-analyze.",
        "raw_response": raw_result[:3000]
    }