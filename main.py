import os
import json
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
    version="0.1.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OBSIDIAN_API_KEY = os.getenv("OBSIDIAN_API_KEY")
OBSIDIAN_URL = os.getenv("OBSIDIAN_URL")


# ============================================================
# VALIDATE ENVIRONMENT
# ============================================================

def check_environment():

    missing = []

    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")

    if not OBSIDIAN_API_KEY:
        missing.append("OBSIDIAN_API_KEY")

    if not OBSIDIAN_URL:
        missing.append("OBSIDIAN_URL")

    if missing:
        raise RuntimeError(
            f"Missing environment variables: {', '.join(missing)}"
        )


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
# OBSIDIAN HELPERS
# ============================================================

def get_obsidian_headers():

    return {
        "Authorization": f"Bearer {OBSIDIAN_API_KEY}",
        "Accept": "application/json"
    }


def get_obsidian_notes():

    check_environment()

    url = f"{OBSIDIAN_URL.rstrip('/')}/vault/"

    response = requests.get(
        url,
        headers=get_obsidian_headers(),
        timeout=20
    )

    response.raise_for_status()

    data = response.json()

    if "files" not in data:
        raise RuntimeError(
            "Obsidian API response does not contain 'files'."
        )

    return data["files"]


def read_note(note_name):

    check_environment()

    from urllib.parse import quote

    encoded_name = quote(
        note_name,
        safe=""
    )

    url = (
        f"{OBSIDIAN_URL.rstrip('/')}"
        f"/vault/{encoded_name}"
    )

    response = requests.get(
        url,
        headers=get_obsidian_headers(),
        timeout=20
    )

    response.raise_for_status()

    return response.text


def get_project_context():

    files = get_obsidian_notes()

    project_files = [
        file
        for file in files
        if isinstance(file, str)
        and file.lower().endswith(".md")
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
                f"Could not read Obsidian note "
                f"{file}: {error}"
            )

    context = "".join(context_parts)

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
# ENVIRONMENT TEST
# ============================================================

@app.get("/config-check")
def config_check():

    return {
        "anthropic_api_key": bool(ANTHROPIC_API_KEY),
        "obsidian_api_key": bool(OBSIDIAN_API_KEY),
        "obsidian_url": bool(OBSIDIAN_URL),
        "obsidian_url_value": (
            OBSIDIAN_URL
            if OBSIDIAN_URL
            else None
        )
    }


# ============================================================
# OBSIDIAN TEST
# ============================================================

@app.get("/obsidian-test")
def obsidian_test():

    try:

        files = get_obsidian_notes()

        return {
            "status": "ok",
            "file_count": len(files),
            "files": files
        }

    except Exception as error:

        print(
            f"Obsidian connection error: {error}"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Could not connect to Obsidian API. "
                f"Error: {str(error)}"
            )
        )


# ============================================================
# ASK AI
# ============================================================

@app.post("/ask")
def ask_project(question: Question):

    try:

        # ----------------------------------------------------
        # Check environment
        # ----------------------------------------------------

        check_environment()

        # ----------------------------------------------------
        # Check Anthropic client
        # ----------------------------------------------------

        if anthropic_client is None:
            raise RuntimeError(
                "Anthropic client was not initialized."
            )

        # ----------------------------------------------------
        # Get Obsidian context
        # ----------------------------------------------------

        context = get_project_context()

        if not context.strip():

            raise RuntimeError(
                "No Markdown notes were found in Obsidian."
            )

        # ----------------------------------------------------
        # Build prompt
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Call Claude
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Extract Claude response
        # ----------------------------------------------------

        raw_result = response.content[0].text.strip()

        # ----------------------------------------------------
        # Parse JSON
        # ----------------------------------------------------

        try:

            result = json.loads(raw_result)

            return result

        except json.JSONDecodeError:

            return {
                "answer": raw_result,
                "key_points": [],
                "sources": []
            }

    except Exception as error:

        # IMPORTANT:
        # This will appear in Vercel logs.

        print(
            "ERROR in /ask:"
        )

        print(
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Error while processing /ask: "
                f"{str(error)}"
            )
        )


# ============================================================
# INTERNSHIP HEALTH CHECK
# ============================================================


So your backend rejects it as invalid JSON. The uploaded output confirms this. :contentReference[oaicite:0]{index=0}

### One important correction

The fix I gave you should handle the code fence, **but your response is also getting quite large**. Let's make the parsing more robust.

In `main.py`, replace your `/health-check` function with the version below:

```python

@app.get("/health-check")
def internship_health_check():

    try:
        context = get_project_context()

        prompt = f"""
You are an AI Internship Intelligence Assistant.

Analyze the real internship notes below.

Return ONLY valid JSON.

IMPORTANT:
- Do NOT use Markdown.
- Do NOT use ```json.
- Do NOT use ``` at all.
- The first character of your response must be {{
- The last character of your response must be }}
- Do not write anything before or after the JSON.

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

- Use ONLY information from the internship notes.
- Do not invent information.
- project_count must reflect documented projects.
- challenge_count must reflect documented challenges.
- technology_count must reflect documented technologies.
- Distinguish completed, in progress, blocked, resolved, and planned.
- Keep descriptions concise.
- Sources must contain exact note filenames.
- Do not create unsupported next steps.
- Do not turn missing documentation into a problem.

REAL INTERNSHIP NOTES:

{context}
"""

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        raw_result = response.content[0].text.strip()

        # ----------------------------------------------------
        # REMOVE MARKDOWN CODE FENCES
        # ----------------------------------------------------

        if "```json" in raw_result:

            raw_result = raw_result.replace("```json", "", 1)

        if "```" in raw_result:

            raw_result = raw_result.replace("```", "")

        raw_result = raw_result.strip()

        # ----------------------------------------------------
        # FIND JSON OBJECT
        # ----------------------------------------------------

        start = raw_result.find("{")
        end = raw_result.rfind("}")

        if start != -1 and end != -1:

            raw_result = raw_result[start:end + 1]

        # ----------------------------------------------------
        # PARSE JSON
        # ----------------------------------------------------

        try:

            result = json.loads(raw_result)

            return result

        except json.JSONDecodeError as error:

            print("JSON parsing error:", error)
            print("Claude response:")
            print(raw_result)

            return {
                "error": "Claude returned invalid JSON.",
                "details": str(error),
                "raw_response": raw_result
            }

    except Exception as error:

        print("Health check error:", error)

        return {
            "error": f"Error while processing /health-check: {str(error)}"
        }