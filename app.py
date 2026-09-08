import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from groq import Groq

# Load variables from a local .env file (never commit the real .env).
load_dotenv(override=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)

# Limit how much code we send so one request cannot blow the token budget.
MAX_CODE_CHARS = 12_000

DEFAULT_MODEL = "openai/gpt-oss-120b"
FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
]


def get_groq_client():
    """Create a Groq client, dynamically reading the key."""
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key:
        return None
    return Groq(api_key=api_key)


def get_groq_model():
    """Retrieve active Groq model with fallback to available production models."""
    model = (os.getenv("GROQ_MODEL") or "").strip()
    if not model or model == "llama-3.3-70b-versatile":
        return DEFAULT_MODEL
    return model


def chat_complete_with_fallback(client, messages, temperature=0.3, max_tokens=2048):
    """Execute chat completion with automatic fallback if a model is retired or unavailable."""
    primary = get_groq_model()
    candidates = [primary] + [m for m in FALLBACK_MODELS if m != primary]

    last_exc = None
    for model_name in candidates:
        try:
            return client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            err_msg = str(exc).lower()
            last_exc = exc
            if "model_not_found" in err_msg or "does not exist" in err_msg:
                continue
            raise exc
    if last_exc:
        raise last_exc


SYSTEM_PROMPTS = {
    "beginner": """You are a patient programming tutor. Explain the given source
code in simple, beginner-friendly English.

Cover these sections, using short paragraphs and markdown headings:
1. What this code does — the overall purpose in plain language
2. How it works — walk through the important lines and flow
3. Key concepts — name the ideas a beginner should notice (loops, APIs, etc.)
4. Possible improvements — optional, constructive suggestions only

Do not rewrite the entire program unless a tiny snippet helps the explanation.
If the input is empty or is not code, say so politely.""",

    "bugfix": """You are an expert code reviewer and debugger. Analyze the given code snippet for any syntax errors, logic flaws, runtime issues, or edge cases.

Cover these sections using markdown headings:
1. Bug Analysis — what is broken, risky, or unexpected, and why
2. Corrected Code — provide the clean, working version in a code block
3. What Changed & Why — concise bullet points explaining what was fixed
4. Prevention Tips — how to prevent this bug in the future.""",

    "complexity": """You are an algorithms and performance specialist. Analyze the computational complexity of the given code.

Cover these sections using markdown headings:
1. Time Complexity (Big-O) — state the Big-O notation (e.g., O(n), O(n²)) and break down the loop/call count
2. Space Complexity — analyze memory allocation and auxiliary space
3. Performance Bottlenecks & Optimizations — point out slow spots and suggest faster alternatives."""
}




@app.route("/")
def home():
    """Serve the single-page frontend."""
    return render_template("index.html")


@app.post("/explain")
def explain():
    """
    Accept JSON {"code": "...", "mode": "beginner"|"bugfix"|"complexity"}
    and return {"explanation": "..."}.
    """
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({"error": "Please send a JSON body with a 'code' field."}), 400

    code = payload.get("code", "")
    mode = payload.get("mode", "beginner")
    if mode not in SYSTEM_PROMPTS:
        mode = "beginner"

    if not isinstance(code, str):
        return jsonify({"error": "The 'code' field must be a string."}), 400

    code = code.strip()
    if not code:
        return jsonify({"error": "Paste some code first, then click Explain."}), 400

    if len(code) > MAX_CODE_CHARS:
        return jsonify({
            "error": f"Please keep the snippet under {MAX_CODE_CHARS:,} characters."
        }), 400

    client = get_groq_client()
    if client is None:
        return jsonify({
            "error": "Server is missing GROQ_API_KEY. Add it to your .env file."
        }), 500

    system_prompt = SYSTEM_PROMPTS[mode]
    user_message = (
        f"Analyze this code using the requested format ({mode} mode):\n\n"
        f"```\n{code}\n```"
    )

    try:
        completion = chat_complete_with_fallback(
            client=client,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
    except Exception as exc:
        # Surface a readable message without dumping secrets or stack traces.
        return jsonify({
            "error": f"Could not reach Groq: {exc}"
        }), 502

    explanation = ""
    if completion.choices:
        explanation = (completion.choices[0].message.content or "").strip()

    if not explanation:
        return jsonify({"error": "The model returned an empty explanation."}), 502

    return jsonify({"explanation": explanation})


@app.post("/followup")
def followup():
    """
    Interactive Q&A Tutor: allows students to ask follow-up questions
    about the explained code. Ideal for computer science education research.
    """
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body."}), 400

    code = payload.get("code", "").strip()
    previous_explanation = payload.get("previous_explanation", "").strip()
    question = payload.get("question", "").strip()

    if not question:
        return jsonify({"error": "Please enter a follow-up question."}), 400

    client = get_groq_client()
    if client is None:
        return jsonify({"error": "GROQ_API_KEY is not configured."}), 500

    system_prompt = (
        "You are an empathetic, world-class Computer Science tutor assisting a student. "
        "The student is examining a piece of code and asking a specific follow-up question. "
        "Answer directly, concisely, and clearly with helpful examples where necessary. "
        "Keep the tone encouraging, academic, and accessible."
    )

    user_message = (
        f"Original Code Snippet:\n```\n{code}\n```\n\n"
        f"Previous Explanation Summary:\n{previous_explanation[:1200]}\n\n"
        f"Student's Follow-up Question:\n{question}"
    )

    try:
        completion = chat_complete_with_fallback(
            client=client,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        answer = completion.choices[0].message.content.strip() if completion.choices else ""
        if not answer:
            return jsonify({"error": "No answer generated."}), 502
        return jsonify({"answer": answer})
    except Exception as exc:
        return jsonify({"error": f"Tutor response error: {exc}"}), 502


@app.post("/tutor_chat")
def tutor_chat():
    """
    Dedicated 24/7 AI Coding Tutor chat endpoint.
    Accepts: { message, code, history: [{"role": "user"|"assistant", "content": "..."}] }
    Answers any programming/CS question with code context awareness.
    """
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid request body."}), 400

    message = payload.get("message", "").strip()
    code = payload.get("code", "").strip()
    history = payload.get("history", [])

    if not message:
        return jsonify({"error": "Please enter a message."}), 400

    client = get_groq_client()
    if client is None:
        return jsonify({"error": "GROQ_API_KEY is not configured."}), 500

    system_prompt = (
        "You are an encouraging, world-class Computer Science Professor and AI Coding Tutor. "
        "Your goal is to help students truly understand programming, algorithms, debugging, "
        "and software engineering principles. "
        "Keep your explanations clear, conceptual, structured, and pedagogical. "
        "Use short markdown formatting, bullet points, and code snippets when helpful."
    )
    if code:
        system_prompt += f"\n\nContext: The student currently has the following code open in their editor:\n```\n{code[:4000]}\n```\nReference this code if their question relates to it."

    messages = [{"role": "system", "content": system_prompt}]
    if isinstance(history, list):
        for msg in history[-6:]:
            if isinstance(msg, dict) and msg.get("role") in ("user", "assistant") and msg.get("content"):
                messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    try:
        completion = chat_complete_with_fallback(
            client=client,
            messages=messages,
            temperature=0.35,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content.strip() if completion.choices else ""
        if not reply:
            return jsonify({"error": "No reply generated."}), 502
        return jsonify({"reply": reply})
    except Exception as exc:
        return jsonify({"error": f"Tutor chat error: {exc}"}), 502


if __name__ == "__main__":
    # debug=True auto-reloads on file changes — handy while learning Flask.
    app.run(debug=True, host="127.0.0.1", port=5000)
