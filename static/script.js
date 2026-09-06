/**
 * AI Code Explainer — Pedagogical CS Tutor
 *
 * Frontend client logic:
 * - Multi-mode code explanation (Beginner, Bugfix, Complexity)
 * - Auto-detect language
 * - Interactive Follow-Up Q&A Tutor for CS research & learning
 * - Dark / Light theme toggle
 * - Copy & Markdown (.md) export
 * - LocalStorage history
 */

const codeInput = document.getElementById("code-input");
const explainBtn = document.getElementById("explain-btn");
const clearBtn = document.getElementById("clear-btn");
const charCount = document.getElementById("char-count");
const langDetected = document.getElementById("lang-detected");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const resultSub = document.getElementById("result-sub");
const emptyState = document.getElementById("empty-state");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");
const historyCount = document.getElementById("history-count");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const btnLabel = explainBtn.querySelector(".btn-label");
const btnSpinner = explainBtn.querySelector(".btn-spinner");

// Theme toggle elements
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeText = document.getElementById("theme-text");

// Follow-up Tutor elements
const followupBox = document.getElementById("followup-box");
const followupThread = document.getElementById("followup-thread");
const followupForm = document.getElementById("followup-form");
const followupInput = document.getElementById("followup-input");
const followupBtn = document.getElementById("followup-btn");
const followupBtnLabel = followupBtn ? followupBtn.querySelector(".followup-btn-label") : null;
const followupBtnSpinner = followupBtn ? followupBtn.querySelector(".followup-btn-spinner") : null;

let currentMode = "beginner";
let latestExplanationRaw = "";

// -------------------------------------------------------------
// Theme Management (Light / Dark)
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("ai_explainer_theme") || "light";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeIcon) themeIcon.textContent = "☀️";
    if (themeText) themeText.textContent = "Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeIcon) themeIcon.textContent = "🌙";
    if (themeText) themeText.textContent = "Dark";
  }
  localStorage.setItem("ai_explainer_theme", theme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    applyTheme(isDark ? "light" : "dark");
  });
}

initTheme();

// -------------------------------------------------------------
// Language Auto-Detection
// -------------------------------------------------------------
function detectLanguage(code) {
  if (!code || code.trim().length < 5) {
    return "Auto-detect";
  }

  const clean = code.trim();

  // Python patterns
  if (
    /^(def |import |from \w+ import|class \w+:|elif |print\(|if __name__ ==)/m.test(clean) ||
    /:\s*(\n|$)/m.test(clean) && !/{/.test(clean)
  ) {
    return "Python";
  }

  // JavaScript / TypeScript patterns
  if (
    /\b(const |let |var |console\.log|function |=>|async |await |export default|import .* from)\b/.test(clean)
  ) {
    return "JavaScript";
  }

  // C / C++ patterns
  if (
    /#include\s*<|std::|cout\s*<<|cin\s*>>|int main\s*\(/.test(clean)
  ) {
    return "C++";
  }

  // Java patterns
  if (
    /\b(public class|public static void main|System\.out\.println)\b/.test(clean)
  ) {
    return "Java";
  }

  // SQL patterns
  if (
    /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|JOIN|GROUP BY)\b/i.test(clean)
  ) {
    return "SQL";
  }

  // HTML / CSS patterns
  if (/<!DOCTYPE|<html|<div|<head|<body/i.test(clean)) {
    return "HTML";
  }

  return "Code";
}

function updateDetectedLanguage() {
  if (!langDetected) return;
  const lang = detectLanguage(codeInput.value);
  langDetected.textContent = lang;
}

// -------------------------------------------------------------
// Sample Snippets
// -------------------------------------------------------------
const SAMPLES = {
  "python-recursion": `def factorial(n):
    # Base case: 0! or 1! is 1
    if n <= 1:
        return 1
    # Recursive case: n * (n-1)!
    return n * factorial(n - 1)

print(factorial(5))  # Output: 120`,

  "js-async": `async function fetchUserProfile(userId) {
  try {
    const res = await fetch(\`https://api.github.com/users/\${userId}\`);
    if (!res.ok) {
      throw new Error(\`Request failed with status \${res.status}\`);
    }
    const data = await res.json();
    return { name: data.name, repos: data.public_repos };
  } catch (error) {
    console.error("Failed to load user:", error.message);
    return null;
  }
}`,

  "buggy-code": `def calculate_average(scores):
    total = 0
    # BUG: What if the list is empty?
    for score in scores:
        total += score
    
    # Potential ZeroDivisionError here!
    return total / len(scores)

print(calculate_average([]))`,

  "binary-search": `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1

    while low <= high:
      mid = (low + high) // 2
      if arr[mid] == target:
          return mid  # Found target index
      elif arr[mid] < target:
          low = mid + 1
      else:
          high = mid - 1

    return -1  # Target not found`
};

const MODE_CAPTIONS = {
  "beginner": "What it does · concepts · improvements",
  "bugfix": "Bug analysis · corrected code · prevention tips",
  "complexity": "Big-O notation · memory space · bottlenecks"
};

const MODE_LABELS = {
  "beginner": "🎓 Beginner",
  "bugfix": "🐞 Bugfix",
  "complexity": "⚡ Complexity"
};

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  if (resultSub && MODE_CAPTIONS[mode]) {
    resultSub.textContent = MODE_CAPTIONS[mode];
  }
}

// Mode button clicks
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setMode(btn.dataset.mode);
  });
});

// Sample chip clicks
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const key = chip.dataset.sample;
    if (SAMPLES[key]) {
      codeInput.value = SAMPLES[key];
      updateCharCount();
      updateDetectedLanguage();
      autoResizeTextarea();
      codeInput.focus();

      // Auto-switch mode for relevant samples
      if (key === "buggy-code") {
        setMode("bugfix");
      } else if (key === "binary-search") {
        setMode("complexity");
      } else if (currentMode !== "beginner") {
        setMode("beginner");
      }
    }
  });
});

function updateCharCount() {
  const n = codeInput.value.length;
  charCount.textContent = `${n.toLocaleString()} chars`;
}

function setLoading(isLoading) {
  explainBtn.disabled = isLoading;
  clearBtn.disabled = isLoading;
  codeInput.disabled = isLoading;
  btnSpinner.hidden = !isLoading;
  btnLabel.textContent = isLoading ? "Explaining…" : "Explain";
}

function showStatus(message, kind) {
  statusEl.hidden = false;
  statusEl.className = `status ${kind}`;
  statusEl.textContent = message;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
}

/**
 * Tiny Markdown subset: headings, lists, bold, inline/code fences.
 */
function renderMarkdown(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const blocks = escaped.split(/```[\w]*\n?/);
  let html = "";

  blocks.forEach((chunk, i) => {
    if (i % 2 === 1) {
      html += `<pre><code>${chunk.replace(/\n$/, "")}</code></pre>`;
      return;
    }

    const lines = chunk.split("\n");
    let inList = false;

    lines.forEach((line) => {
      const heading = line.match(/^#{1,3}\s+(.+)$/);
      const bullet = line.match(/^[-*]\s+(.+)$/);

      if (heading) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h3>${inlineFormat(heading[1])}</h3>`;
        return;
      }

      if (bullet) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${inlineFormat(bullet[1])}</li>`;
        return;
      }

      if (inList) {
        html += "</ul>";
        inList = false;
      }

      if (line.trim() === "") {
        return;
      }

      html += `<p>${inlineFormat(line)}</p>`;
    });

    if (inList) {
      html += "</ul>";
    }
  });

  return html;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

async function explainCode() {
  const code = codeInput.value.trim();
  hideStatus();

  if (!code) {
    emptyState.hidden = false;
    resultEl.hidden = true;
    if (copyBtn) copyBtn.hidden = true;
    if (downloadBtn) downloadBtn.hidden = true;
    if (followupBox) followupBox.hidden = true;
    showStatus("Paste some code first or pick a sample above.", "error");
    return;
  }

  setLoading(true);
  emptyState.hidden = true;
  resultEl.hidden = true;
  if (copyBtn) copyBtn.hidden = true;
  if (downloadBtn) downloadBtn.hidden = true;
  if (followupBox) followupBox.hidden = true;
  showStatus("Analyzing code with Groq AI… takes 1-2 seconds.", "info");

  try {
    const response = await fetch("/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, mode: currentMode }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    if (!data.explanation) {
      throw new Error("The server did not return an explanation.");
    }

    hideStatus();
    latestExplanationRaw = data.explanation;
    resultEl.hidden = false;
    resultEl.innerHTML = renderMarkdown(data.explanation);
    if (copyBtn) copyBtn.hidden = false;
    if (downloadBtn) downloadBtn.hidden = false;

    // Reset and reveal follow-up tutor
    if (followupBox) {
      followupBox.hidden = false;
      if (followupThread) followupThread.innerHTML = "";
      if (followupInput) followupInput.value = "";
    }

    // Save successful explanation to history
    saveToHistory(code, currentMode, data.explanation);
  } catch (err) {
    resultEl.hidden = true;
    emptyState.hidden = false;
    if (copyBtn) copyBtn.hidden = true;
    if (downloadBtn) downloadBtn.hidden = true;
    if (followupBox) followupBox.hidden = true;
    showStatus(err.message || "Something went wrong.", "error");
  } finally {
    setLoading(false);
  }
}

function autoResizeTextarea() {
  codeInput.style.height = "auto";
  if (codeInput.value.trim().length > 0) {
    codeInput.style.height = Math.max(140, codeInput.scrollHeight) + "px";
  } else {
    codeInput.style.height = "140px";
  }
}

function clearEditor() {
  codeInput.value = "";
  autoResizeTextarea();
  updateCharCount();
  updateDetectedLanguage();
  hideStatus();
  resultEl.hidden = true;
  resultEl.innerHTML = "";
  if (copyBtn) copyBtn.hidden = true;
  if (downloadBtn) downloadBtn.hidden = true;
  if (followupBox) followupBox.hidden = true;
  emptyState.hidden = false;
  codeInput.focus();
}

// -------------------------------------------------------------
// Interactive Follow-Up Q&A Tutor
// -------------------------------------------------------------
if (followupForm) {
  followupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = (followupInput.value || "").trim();
    if (!question) return;

    // Append student's question to thread
    const userMsgEl = document.createElement("div");
    userMsgEl.className = "followup-msg user-msg";
    userMsgEl.innerHTML = `<strong>You:</strong> ${escapeHtml(question)}`;
    followupThread.appendChild(userMsgEl);
    followupInput.value = "";
    followupThread.scrollTop = followupThread.scrollHeight;

    // Loading state
    if (followupBtn) followupBtn.disabled = true;
    if (followupBtnSpinner) followupBtnSpinner.hidden = false;
    if (followupBtnLabel) followupBtnLabel.textContent = "Thinking…";

    try {
      const res = await fetch("/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeInput.value.trim(),
          previous_explanation: latestExplanationRaw,
          question: question
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to get tutor answer.");
      }

      // Append tutor's answer
      const tutorMsgEl = document.createElement("div");
      tutorMsgEl.className = "followup-msg tutor-msg";
      tutorMsgEl.innerHTML = `<strong>🎓 Tutor:</strong><br>${renderMarkdown(data.answer)}`;
      followupThread.appendChild(tutorMsgEl);
      followupThread.scrollTop = followupThread.scrollHeight;
    } catch (err) {
      const errEl = document.createElement("div");
      errEl.className = "followup-msg tutor-msg";
      errEl.style.color = "var(--danger)";
      errEl.textContent = `⚠️ Error: ${err.message || "Tutor unavailable"}`;
      followupThread.appendChild(errEl);
    } finally {
      if (followupBtn) followupBtn.disabled = false;
      if (followupBtnSpinner) followupBtnSpinner.hidden = true;
      if (followupBtnLabel) followupBtnLabel.textContent = "Ask";
      followupInput.focus();
    }
  });
}

// Copy Explanation to Clipboard
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const textToCopy = latestExplanationRaw || resultEl.innerText || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      const copyText = copyBtn.querySelector(".copy-text");
      copyBtn.classList.add("copied");
      if (copyText) copyText.textContent = "Copied!";

      setTimeout(() => {
        copyBtn.classList.remove("copied");
        if (copyText) copyText.textContent = "Copy";
      }, 2000);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  });
}

// Download as Markdown file
if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    const content = latestExplanationRaw || resultEl.innerText || "";
    if (!content) return;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `code-walkthrough-${currentMode}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// -------------------------------------------------------------
// History Management (LocalStorage)
// -------------------------------------------------------------
const STORAGE_KEY = "ai_explainer_recent_history";

function getHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToHistory(code, mode, explanation) {
  const history = getHistory();
  const firstLine = code.split("\n")[0].trim().slice(0, 50) || "Code Snippet";
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newItem = {
    id: Date.now(),
    title: firstLine,
    code,
    mode,
    explanation,
    time: timeStr
  };

  // Keep top 6 most recent, avoiding duplicates
  const filtered = history.filter(item => item.code.trim() !== code.trim());
  filtered.unshift(newItem);
  const updated = filtered.slice(0, 6);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Storage quota exceeded", e);
  }

  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (!historySection || !historyList) return;

  if (history.length === 0) {
    historySection.hidden = true;
    return;
  }

  historySection.hidden = false;
  if (historyCount) historyCount.textContent = `${history.length} saved`;
  historyList.innerHTML = "";

  history.forEach(item => {
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-mode">${MODE_LABELS[item.mode] || item.mode}</span>
        <span class="history-item-time">${item.time}</span>
      </div>
      <div class="history-item-snippet"><code>${escapeHtml(item.title)}</code></div>
    `;

    el.addEventListener("click", () => {
      // Reload this saved walkthrough
      codeInput.value = item.code;
      updateCharCount();
      updateDetectedLanguage();
      autoResizeTextarea();
      setMode(item.mode);

      hideStatus();
      latestExplanationRaw = item.explanation;
      emptyState.hidden = true;
      resultEl.hidden = false;
      resultEl.innerHTML = renderMarkdown(item.explanation);
      if (copyBtn) copyBtn.hidden = false;
      if (downloadBtn) downloadBtn.hidden = false;
      if (followupBox) {
        followupBox.hidden = false;
        if (followupThread) followupThread.innerHTML = "";
      }

      // Smooth scroll to top of workspace
      document.querySelector(".workspace")?.scrollIntoView({ behavior: "smooth" });
    });

    historyList.appendChild(el);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  });
}

codeInput.addEventListener("input", () => {
  updateCharCount();
  updateDetectedLanguage();
  autoResizeTextarea();
});
explainBtn.addEventListener("click", explainCode);
clearBtn.addEventListener("click", clearEditor);

// Ctrl/Cmd + Enter submits, matching standard IDEs.
codeInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    explainCode();
  }
});

updateCharCount();
updateDetectedLanguage();
autoResizeTextarea();
renderHistory();

// -------------------------------------------------------------
// Floating AI Tutor Drawer Logic
// -------------------------------------------------------------
const openTutorBtn = document.getElementById("open-tutor-btn");
const closeTutorBtn = document.getElementById("close-tutor-btn");
const tutorDrawer = document.getElementById("tutor-drawer");
const tutorBackdrop = document.getElementById("tutor-backdrop");
const drawerMessages = document.getElementById("drawer-messages");
const drawerChatForm = document.getElementById("drawer-chat-form");
const drawerChatInput = document.getElementById("drawer-chat-input");
const drawerSendBtn = document.getElementById("drawer-send-btn");

let tutorChatHistory = [];

function openTutorDrawer() {
  if (tutorDrawer) {
    tutorDrawer.hidden = false;
    tutorDrawer.style.display = "flex";
  }
  if (tutorBackdrop) {
    tutorBackdrop.hidden = false;
    tutorBackdrop.style.display = "block";
  }
  setTimeout(() => drawerChatInput?.focus(), 150);
}

function closeTutorDrawer() {
  if (tutorDrawer) {
    tutorDrawer.hidden = true;
    tutorDrawer.style.display = "none";
  }
  if (tutorBackdrop) {
    tutorBackdrop.hidden = true;
    tutorBackdrop.style.display = "none";
  }
}

if (openTutorBtn) openTutorBtn.addEventListener("click", openTutorDrawer);
if (closeTutorBtn) closeTutorBtn.addEventListener("click", closeTutorDrawer);
if (tutorBackdrop) tutorBackdrop.addEventListener("click", closeTutorDrawer);

// Quick prompts in drawer
document.querySelectorAll(".drawer-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (drawerChatInput) {
      drawerChatInput.value = chip.dataset.ask;
      sendTutorChatMessage();
    }
  });
});

async function sendTutorChatMessage() {
  const message = (drawerChatInput.value || "").trim();
  if (!message) return;

  // Append User message
  const userEl = document.createElement("div");
  userEl.className = "tutor-chat-bubble user-bubble";
  userEl.innerHTML = `<strong>You:</strong><p>${escapeHtml(message)}</p>`;
  drawerMessages.appendChild(userEl);
  drawerChatInput.value = "";
  drawerMessages.scrollTop = drawerMessages.scrollHeight;

  // Loading state
  const loadingEl = document.createElement("div");
  loadingEl.className = "tutor-chat-bubble tutor-bubble";
  loadingEl.innerHTML = `<strong>🎓 Tutor:</strong><p>Thinking…</p>`;
  drawerMessages.appendChild(loadingEl);
  drawerMessages.scrollTop = drawerMessages.scrollHeight;

  if (drawerSendBtn) drawerSendBtn.disabled = true;

  try {
    const res = await fetch("/tutor_chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        code: codeInput.value.trim(),
        history: tutorChatHistory
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to get tutor answer.");
    }

    loadingEl.innerHTML = `<strong>🎓 Tutor:</strong>${renderMarkdown(data.reply)}`;
    tutorChatHistory.push({ role: "user", content: message });
    tutorChatHistory.push({ role: "assistant", content: data.reply });
  } catch (err) {
    loadingEl.innerHTML = `<strong style="color:var(--danger)">🎓 Tutor:</strong><p style="color:var(--danger)">⚠️ ${err.message || "Tutor is temporarily unavailable."}</p>`;
  } finally {
    if (drawerSendBtn) drawerSendBtn.disabled = false;
    drawerMessages.scrollTop = drawerMessages.scrollHeight;
    drawerChatInput.focus();
  }
}

if (drawerChatForm) {
  drawerChatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendTutorChatMessage();
  });
}

