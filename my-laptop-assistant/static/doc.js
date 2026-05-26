/* ─────────────────────────────────────────────
   doc.js — Document assistant logic
   Handles file upload, question sending, quick actions
   ───────────────────────────────────────────── */

   let currentDocText = '';   // stores extracted text after upload

   // ── File upload ──────────────────────────────
   
   const dropZone   = document.getElementById('dropZone');
   const fileInput  = document.getElementById('fileInput');
   const dropLabel  = document.getElementById('dropLabel');
   const fileInfo   = document.getElementById('fileInfo');
   const fileName   = document.getElementById('fileName');
   const fileMeta   = document.getElementById('fileMeta');
   
   // Click the drop zone → open file picker
   dropZone.addEventListener('click', () => fileInput.click());
   
   // Drag-and-drop support
   dropZone.addEventListener('dragover', (e) => {
     e.preventDefault();
     dropZone.classList.add('drag-over');
   });
   
   dropZone.addEventListener('dragleave', () => {
     dropZone.classList.remove('drag-over');
   });
   
   dropZone.addEventListener('drop', (e) => {
     e.preventDefault();
     dropZone.classList.remove('drag-over');
     const file = e.dataTransfer.files[0];
     if (file) uploadFile(file);
   });
   
   // File picker selection
   fileInput.addEventListener('change', () => {
     if (fileInput.files[0]) uploadFile(fileInput.files[0]);
   });
   
   /**
    * Send the file to Flask's /upload-doc route.
    * Flask extracts the text and sends it back as JSON.
    * We store it in currentDocText for use in questions.
    */
   async function uploadFile(file) {
     dropLabel.textContent = 'Reading file...';
     dropZone.classList.remove('loaded');
     setStatus('thinking');
   
     const formData = new FormData();
     formData.append('file', file);
   
     try {
       const response = await fetch('/upload-doc', {
         method: 'POST',
         body: formData    // NOTE: no Content-Type header — browser sets it automatically for FormData
       });
   
       const data = await response.json();
   
       if (data.error) {
         dropLabel.textContent = `Error: ${data.error}`;
         setStatus('idle');
         return;
       }
   
       // Store text for future questions
       currentDocText = data.text;
   
       // Update sidebar UI
       dropZone.classList.add('loaded');
       dropLabel.textContent = '✓ File loaded';
       fileInfo.style.display = 'block';
       fileName.textContent = data.filename;
       fileMeta.textContent = `${data.word_count.toLocaleString()} words extracted`;
   
       // Greet the user in chat
       addBubble('assistant',
         `I've read "${data.filename}" (${data.word_count.toLocaleString()} words). ` +
         `Ask me anything about it, or use the quick actions on the left!`
       );
       setStatus('ready');
   
     } catch (err) {
       dropLabel.textContent = 'Upload failed — is Flask running?';
       console.error(err);
       setStatus('idle');
     }
   }
   
   // ── Quick action buttons ──────────────────────
   
   document.querySelectorAll('.quick-btn').forEach(btn => {
     btn.addEventListener('click', () => {
       const question = btn.dataset.q;
       if (question) sendDocQuestion(question);
     });
   });
   
   // ── Question input ────────────────────────────
   
   // Send on Enter key
   document.getElementById('questionInput').addEventListener('keydown', (e) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       sendDocQuestion();
     }
   });
   
   /**
    * Send a question to Flask's /ask-doc route.
    * Optionally pass a question string directly (from quick action buttons).
    */
   async function sendDocQuestion(questionOverride) {
     const input    = document.getElementById('questionInput');
     const question = questionOverride || input.value.trim();
   
     if (!question) return;
   
     if (!currentDocText) {
       addBubble('assistant', 'Please load a document first using the panel on the left.');
       return;
     }
   
     // Show user's message and clear input
     addBubble('user', question);
     input.value = '';
     setInputLocked(true);
     setStatus('thinking');
   
     // Show typing indicator while we wait
     showTyping();
   
     try {
       const response = await fetch('/ask-doc', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           question:  question,
           doc_text:  currentDocText
         })
       });
   
       const data = await response.json();
       hideTyping();
   
       if (data.error) {
         addBubble('assistant', `Error: ${data.error}`);
       } else {
         addBubble('assistant', data.answer);
       }
   
     } catch (err) {
       hideTyping();
       addBubble('assistant', 'Something went wrong. Make sure Flask is running (python app.py).');
       console.error(err);
     }
   
     setInputLocked(false);
     setStatus('ready');
     document.getElementById('questionInput').focus();
   }