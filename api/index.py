import os
import json
import requests

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="AI Internship Memory Assistant",
    description="AI assistant that answers questions using internship notes stored in Obsidian.",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

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


if not ANTHROPIC_API_KEY:
    print("WARNING: ANTHROPIC_API_KEY is not configured.")

if not OBSIDIAN_API_KEY:
    print("WARNING: OBSIDIAN_API_KEY is not configured.")

if not OBSIDIAN_URL:
    print("WARNING: OBSIDIAN_URL is not configured.")


# ============================================================
# ANTHROPIC CLIENT
# ============================================================

anthropic_client = None

if ANTHROPIC_API_KEY:
    anthropic_client = Anthropic(
        api_key=ANTHROPIC_API_KEY
    )


# ============================================================
# REQUEST MODEL
# ============================================================

class Question(BaseModel):
    question: str


# ============================================================
# ENVIRONMENT VALIDATION
# ============================================================

def validate_environment():

    missing = []

    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")

    if not OBSIDIAN_API_KEY:
        missing.append("OBSIDIAN_API_KEY")

    if not OBSIDIAN_URL:
        missing.append("OBSIDIAN_URL")

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing environment variables: {', '.join(missing)}"
        )


# ============================================================
# OBSIDIAN
# ============================================================

def obsidian_headers():

    return {
        "Authorization": f"Bearer {OBSIDIAN_API_KEY}"
    }


def get_obsidian_notes():

    validate_environment()

    response = requests.get(
        f"{OBSIDIAN_URL.rstrip('/')}/vault/",
        headers=obsidian_headers(),
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    return data.get("files", [])


def read_note(note_name):

    validate_environment()

    response = requests.get(
        f"{OBSIDIAN_URL.rstrip('/')}/vault/{note_name}",
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
        if file.endswith(".md")
    ]

    context_parts = []

    for file in project_files:

        try:

            content = read_note(file)

            context_parts.append(
                f"\n--- {file} ---\n{content}"
            )

        except Exception as error:

            print(
                f"Could not read {file}: {error}"
            )

    return "\n".join(context_parts)


# ============================================================
# CLAUDE JSON CLEANING
# ============================================================

def clean_claude_json(raw_text):

    if not raw_text:
        raise ValueError("Claude returned an empty response.")

    text = raw_text.strip()

    # --------------------------------------------------------
    # Remove markdown code fences
    # --------------------------------------------------------

    if text.startswith("```json"):

        text = text[len("```json"):].strip()

    elif text.startswith("```"):

        text = text[len("```"):].strip()

    if text.endswith("```"):

        text = text[:-3].strip()

    # --------------------------------------------------------
    # Find the JSON object
    # --------------------------------------------------------

    start = text.find("{")

    if start == -1:

        raise ValueError(
            "Claude response does not contain a JSON object."
        )

    text = text[start:]

    # --------------------------------------------------------
    # First attempt: normal JSON parsing
    # --------------------------------------------------------

    try:

        return json.loads(text)

    except json.JSONDecodeError:

        pass

    # --------------------------------------------------------
    # Try to recover JSON if Claude added extra text
    # --------------------------------------------------------

    decoder = json.JSONDecoder()

    try:

        parsed, _ = decoder.raw_decode(text)

        return parsed

    except json.JSONDecodeError as error:

        raise ValueError(
            f"Invalid JSON from Claude: {error}"
        )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "AI Internship Memory Assistant is running",
        "endpoints": [
            "/ask",
            "/health",
            "/health-check",
            "/docs"
        ]
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "obsidian_configured": bool(OBSIDIAN_URL),
        "anthropic_configured": bool(ANTHROPIC_API_KEY)
    }


# ============================================================
# ASK AI
# ============================================================

@app.post("/ask")
def ask_project(question: Question):

    try:

        context = get_project_context()

        if not context.strip():

            return {
                "answer": "No internship notes were found.",
                "key_points": [],
                "sources": []
            }

        prompt = f"""
You are an AI Internship Memory Assistant.

Answer the user's question using ONLY the real internship
information stored in the provided Obsidian notes.

Return ONLY valid JSON.

Do not use Markdown.
Do not use ```json.
Do not add any text before or after the JSON.

Use exactly this structure:

{{
    "answer": "string",
    "key_points": ["string"],
    "sources": ["filename.md"]
}}

Rules:

- Answer the user's question directly.
- Use ONLY information found in the notes.
- Do not invent information.
- Do not assume something happened if it is not documented.
- If information is unavailable, say:
  "This is not documented in the available internship notes."
- Keep the answer concise.
- key_points should contain at most 5 important points.
- sources should contain exact note filenames.
- Only include sources that support the answer.
- Do not include unnecessary details.

REAL INTERNSHIP NOTES:

{context}

USER QUESTION:

{question.question}
"""

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

        raw_result = response.content[0].text.strip()

        print("Claude /ask response:")
        print(raw_result)

        try:

            return clean_claude_json(raw_result)

        except Exception:

            return {
                "answer": raw_result,
                "key_points": [],
                "sources": []
            }

    except HTTPException:

        raise

    except Exception as error:

        print(
            f"Error while processing /ask: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Error while processing /ask: {str(error)}"
        )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health-check")
def internship_health_check():

    try:

        context = get_project_context()

        if not context.strip():

            return {
                "summary": {
                    "status": "No internship notes found",
                    "project_count": 0,
                    "challenge_count": 0,
                    "technology_count": 0,
                    "overview": "No internship information is currently available."
                },
                "projects": [],
                "accomplishments": [],
                "challenges": [],
                "learning": [],
                "current_focus": [],
                "next_steps": []
            }

        prompt = f"""
You are an AI Internship Intelligence Assistant.

Analyze the real internship notes below.

Use ONLY information documented in the notes.

Return ONLY valid JSON.

DO NOT use Markdown.
DO NOT use ```json.
DO NOT add explanations outside the JSON.

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

IMPORTANT OUTPUT LIMITS:

- Keep the entire response concise.
- Maximum 8 projects.
- Maximum 8 accomplishments.
- Maximum 5 challenges.
- Maximum 6 learning items.
- Maximum 5 current_focus items.
- Maximum 5 next_steps items.
- Keep every description to ONE sentence.
- Do not repeat the same information.
- Do not include unnecessary details.

PROJECT FORMAT:

{{
    "name": "",
    "status": "",
    "description": "",
    "sources": []
}}

ACCOMPLISHMENT FORMAT:

{{
    "accomplishment": "",
    "sources": []
}}

CHALLENGE FORMAT:

{{
    "title": "",
    "description": "",
    "status": "",
    "sources": []
}}

LEARNING FORMAT:

{{
    "area": "",
    "description": "",
    "sources": []
}}

CURRENT FOCUS FORMAT:

{{
    "focus": "",
    "sources": []
}}

NEXT STEP FORMAT:

{{
    "step": "",
    "sources": []
}}

RULES:

- Do not invent projects.
- Do not invent accomplishments.
- Do not invent challenges.
- Do not invent technologies.
- Do not invent architectural decisions.
- Do not claim RAG, fine-tuning, SSO, etc. unless explicitly documented.
- Distinguish completed, in progress, blocked and planned.
- Do not turn missing documentation into a problem.
- Use recent notes to determine current focus.
- Sources must contain exact note filenames.
- Only include sources that support the statement.
- Keep the response professional and concise.

REAL INTERNSHIP NOTES:

{context}
"""

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=7000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        raw_result = response.content[0].text.strip()

        print("Claude /health-check response:")
        print(raw_result)

        try:

            result = clean_claude_json(raw_result)

            # Make sure expected keys exist.
            result.setdefault(
                "summary",
                {
                    "status": "in progress",
                    "project_count": 0,
                    "challenge_count": 0,
                    "technology_count": 0,
                    "overview": ""
                }
            )

            result.setdefault("projects", [])
            result.setdefault("accomplishments", [])
            result.setdefault("challenges", [])
            result.setdefault("learning", [])
            result.setdefault("current_focus", [])
            result.setdefault("next_steps", [])

            return result

        except Exception as error:

            print(
                f"Claude JSON parsing failed: {error}"
            )

            # ------------------------------------------------
            # Do NOT return Claude's giant raw response to
            # the frontend.
            # ------------------------------------------------

            return {
                "summary": {
                    "status": "Analysis generated but could not be parsed",
                    "project_count": 0,
                    "challenge_count": 0,
                    "technology_count": 0,
                    "overview": "Claude returned a response that could not be converted into the required JSON format."
                },
                "projects": [],
                "accomplishments": [],
                "challenges": [],
                "learning": [],
                "current_focus": [],
                "next_steps": [],
                "error": "Claude returned invalid JSON."
            }

    except HTTPException:

        raise

    except Exception as error:

        print(
            f"Error while processing /health-check: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Error while processing /health-check: {str(error)}"
        )