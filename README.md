# AI Code Explainer — Intelligent Pedagogical Code Tutor

An intelligent, interactive Computer Science tutoring web application built with **Flask**, **Vanilla JS**, and the **Groq LPU Inference Engine**. Designed for CS education, pedagogical scaffolding, and code comprehension research.

---

## 🔬 Academic & Research Overview (Mitacs / CS Education)

This project explores **Human-AI Interaction in Computer Science Education (CS Ed)** and **Intelligent Tutoring Systems (ITS)**. Rather than simply giving answers or generating boilerplate, the system implements pedagogical scaffolding techniques:

1. **Multi-Perspective Pedagogical Modes**:
   - 🎓 **Beginner Walkthrough:** Conceptual decomposition, plain-English flow analysis, and fundamental principles.
   - 🐞 **Root-Cause Debugger & Fix:** Identifies subtle edge-cases, syntax anomalies, and off-by-one errors with constructive fixes.
   - ⚡ **Algorithmic Complexity (Big-O):** Computes time ($O(n)$, $O(\log n)$) and auxiliary space complexity, highlighting runtime bottlenecks.
2. **Interactive Socratic Follow-Up Q&A**:
   - Conversational follow-up thread allowing students to ask targeted follow-up doubts (e.g., *"What happens if input is negative?"*, *"Can this be rewritten iteratively?"*).
3. **Adaptive UI & Auto-Language Detection**:
   - Dynamic language heuristic detection (Python, JavaScript, C++, Java, SQL).
   - High-contrast Dark / Paper-warm Light mode tailored for long reading sessions.
4. **Offline Persistence & Export**:
   - LocalStorage-backed session history to compare multiple iterations.
   - 1-click Markdown (`.md`) export for revision notes.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Python 3.11+, Flask (RESTful microservices), `groq` Python SDK
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, Custom CSS3 Design System
- **Inference Layer:** Groq LPUs (`llama-3.3-70b-versatile` / `openai/gpt-oss-120b`) for sub-second responses
- **Token Management:** Client-side character validation (12,000 char threshold) to prevent runaway context exhaustion

---

## 🚀 Quickstart Guide

### 1. Virtual Environment & Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd "AI Code Explainer"

# Setup virtual environment
python -m venv .venv
.\.venv\Scripts\activate       # Windows
# source .venv/bin/activate    # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

### 3. Run Development Server

```bash
python app.py
```

Access the tutor at **`http://127.0.0.1:5000`**.

---

## 📂 Project Structure

```text
AI Code Explainer/
├── app.py                 # Flask server, prompt engineering & /followup endpoints
├── templates/
│   └── index.html         # Accessible single-page semantic interface
├── static/
│   ├── style.css          # Design system, dark/light theme tokens, responsive layout
│   └── script.js          # Client logic, auto-resizing, follow-up thread, history
├── requirements.txt       # Python dependencies
└── README.md              # Research & technical documentation
```

---

## 💡 Future Research Extensions
- Fine-grained token visualizer highlighting AST (Abstract Syntax Tree) nodes.
- Execution sandbox (Pyodide / WebAssembly) to run code side-by-side with explanations.
