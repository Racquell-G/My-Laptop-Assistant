/* ─────────────────────────────────────────────
   script.js — shared utilities
   Used by both doc.html and organizer.html
   ───────────────────────────────────────────── */

/**
 * Add a chat bubble to the chat area.
 * role: "user" | "assistant"
 */
function addBubble(role, text) {
    const chatArea = document.getElementById('chatArea');
  
    // Remove welcome screen on first message
    const welcome = chatArea.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
  
    const wrap = document.createElement('div');
    wrap.className = `bubble-wrap ${role}`;
  
    const roleLabel = document.createElement('div');
    roleLabel.className = 'bubble-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'Assistant';
  
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role}`;
    bubble.textContent = text;
  
    wrap.appendChild(roleLabel);
    wrap.appendChild(bubble);
    chatArea.appendChild(wrap);
    scrollToBottom();
  
    return wrap;
  }
  
  /** Show the animated typing indicator. Returns the element so you can remove it. */
  function showTyping() {
    const chatArea = document.getElementById('chatArea');
  
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap assistant';
    wrap.id = 'typingIndicator';
  
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
  
    wrap.appendChild(dots);
    chatArea.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }
  
  /** Remove the typing indicator. */
  function hideTyping() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
  }
  
  /** Scroll chat to the bottom. */
  function scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    chatArea.scrollTop = chatArea.scrollHeight;
  }
  
  /** Set the status dot in the header. state: "idle" | "thinking" | "ready" */
  function setStatus(state) {
    const dot = document.getElementById('statusDot');
    if (!dot) return;
    dot.className = 'status-dot';
    if (state === 'thinking') dot.classList.add('thinking');
    if (state === 'ready')    dot.classList.add('ready');
  }
  
  /** Disable / enable the send button and input. */
  function setInputLocked(locked) {
    const sendBtn   = document.getElementById('sendBtn');
    const chatInput = document.getElementById('questionInput') || document.getElementById('chatInput');
    if (sendBtn)   sendBtn.disabled   = locked;
    if (chatInput) chatInput.disabled = locked;
  }