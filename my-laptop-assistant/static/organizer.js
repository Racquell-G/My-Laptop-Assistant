/* ─────────────────────────────────────────────
   organizer.js — File organizer logic
   Handles folder scanning and chat-based refinement
   ───────────────────────────────────────────── */

// Conversation history — grows with every message so Ollama has context
let chatHistory = [];

// ── Enter key on folder input triggers scan ───

document.getElementById('folderInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') scanFolder();
});

// ── Enter key on chat input ───────────────────

document.getElementById('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendOrgChat();
  }
});

// ── Folder scan ───────────────────────────────

/**
 * Reads the folder path from the input, sends it to Flask's /scan-folder route.
 * Flask scans the folder and asks Ollama for an organization plan.
 * Result is shown as a chat bubble, and stored in chatHistory for follow-up.
 */
async function scanFolder() {
  const folderInput = document.getElementById('folderInput');
  const scanBtn     = document.getElementById('scanBtn');
  const folder      = folderInput.value.trim();

  if (!folder) {
    addBubble('assistant', 'Please paste a folder path first.');
    return;
  }

  // Reset state for a fresh scan
  chatHistory = [];
  addBubble('user', `Scan and organize: ${folder}`);
  setInputLocked(true);
  scanBtn.disabled = true;
  setStatus('thinking');
  showTyping();

  try {
    const response = await fetch('/scan-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder })
    });

    const data = await response.json();
    hideTyping();

    if (data.error) {
      addBubble('assistant', `Error: ${data.error}`);
      setStatus('idle');
    } else {
      // Show the AI plan in chat
      addBubble('assistant', data.plan);
      addBubble('assistant',
        `That's my suggestion based on ${data.total} files across ${data.types} file types. ` +
        `Use the chat below to refine it — for example: "keep all my code together" or ` +
        `"I want a separate archive folder for old stuff".`
      );

      // Seed chatHistory so Ollama has context for follow-ups
      chatHistory.push({
        role: 'assistant',
        content: data.plan
      });

      // Show stats in sidebar
      showStats(data.breakdown);
      setStatus('ready');
    }

  } catch (err) {
    hideTyping();
    addBubble('assistant', 'Something went wrong. Make sure Flask is running (python app.py).');
    console.error(err);
    setStatus('idle');
  }

  setInputLocked(false);
  scanBtn.disabled = false;
}

// ── Chat refinement ───────────────────────────

/**
 * Send a follow-up message to refine the organization plan.
 * We send the full chatHistory so Ollama has all context.
 */
async function sendOrgChat() {
  const input   = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  if (chatHistory.length === 0) {
    addBubble('assistant', 'Please scan a folder first using the panel on the left.');
    return;
  }

  // Add user message to history and display it
  chatHistory.push({ role: 'user', content: message });
  addBubble('user', message);
  input.value = '';
  setInputLocked(true);
  setStatus('thinking');
  showTyping();

  try {
    const response = await fetch('/chat-organizer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: chatHistory })
    });

    const data = await response.json();
    hideTyping();

    if (data.error) {
      addBubble('assistant', `Error: ${data.error}`);
    } else {
      // Add assistant reply to history and display it
      chatHistory.push({ role: 'assistant', content: data.reply });
      addBubble('assistant', data.reply);
    }

  } catch (err) {
    hideTyping();
    addBubble('assistant', 'Something went wrong. Make sure Flask is running (python app.py).');
    console.error(err);
  }

  setInputLocked(false);
  setStatus('ready');
  document.getElementById('chatInput').focus();
}

// ── Sidebar stats ─────────────────────────────

/**
 * Populate the stats panel in the sidebar with file type breakdown.
 * breakdown: { ".pdf": 12, ".txt": 5, ... }
 */
function showStats(breakdown) {
  const section   = document.getElementById('statsSection');
  const statsGrid = document.getElementById('statsGrid');

  // Sort by count descending, show top 10
  const sorted = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  statsGrid.innerHTML = sorted.map(([ext, count]) => `
    <div class="stat-row">
      <span class="stat-ext">${ext}</span>
      <span class="stat-count">${count}</span>
    </div>
  `).join('');

  section.style.display = 'block';
}