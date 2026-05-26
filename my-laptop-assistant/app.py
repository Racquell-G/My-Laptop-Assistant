"""
My Laptop Assistant
-------------------
A desktop app with two AI-powered tools:
  1. Document Assistant -> drop a PDF/TXT and ask questions about it
  2. File Organizer     -> scan a folder, get organization suggestions, chat for tweaks
 
Requires:
    pip install customtkinter ollama pypdf
    Ollama running locally: https://ollama.com  (ollama run llama3.2)
"""

import os
import json
import pathlib
from flask import Flask, render_template, request, jsonify
import ollama
from pypdf import PdfReader
 
app = Flask(__name__)
 
MODEL = "llama3.2"   # change this if you pulled a different model
 
 
# ─────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────
 
def read_file(path: str) -> str:
    """Extract plain text from a PDF or text file."""
    p = pathlib.Path(path)
    if p.suffix.lower() == ".pdf":
        reader = PdfReader(path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return p.read_text(errors="ignore")
 
 
def ask_ollama(prompt: str, system: str = "") -> str:
    """Send a prompt to the local Ollama model and return its reply."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    try:
        response = ollama.chat(model=MODEL, messages=messages)
        return response["message"]["content"]
    except Exception as e:
        return (
            f"Ollama error: {e}\n\n"
            f"Make sure Ollama is running and you have pulled {MODEL}.\n"
            f"Open a terminal and run: ollama run {MODEL}"
        )
 
 
def chat_ollama(history: list) -> str:
    """Send a full conversation history to Ollama and return its reply."""
    try:
        response = ollama.chat(model=MODEL, messages=history)
        return response["message"]["content"]
    except Exception as e:
        return f"Ollama error: {e}"
 
 
def scan_folder(folder: str) -> dict:
    """Walk a folder and return {extension: [filenames]} grouped by file type."""
    groups: dict[str, list[str]] = {}
    try:
        for root, _, files in os.walk(folder):
            for f in files:
                rel = os.path.relpath(os.path.join(root, f), folder)
                ext = pathlib.Path(f).suffix.lower() or ".no_ext"
                groups.setdefault(ext, []).append(rel)
    except PermissionError:
        pass
    return groups
 
 
# ─────────────────────────────────────────────
# Page routes (serve HTML templates)
# ─────────────────────────────────────────────
 
@app.route("/")
def index():
    return render_template("index.html")
 
 
@app.route("/doc")
def doc_page():
    return render_template("doc.html")
 
 
@app.route("/organizer")
def organizer_page():
    return render_template("organizer.html")
 
 
# ─────────────────────────────────────────────
# API routes (return JSON to JavaScript)
# ─────────────────────────────────────────────
 
@app.route("/upload-doc", methods=["POST"])
def upload_doc():
    """
    Receives an uploaded file, extracts its text, and returns it.
    JavaScript stores the text and sends it with every question.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
 
    file = request.files["file"]
    filename = file.filename or ""
 
    # Save temporarily so pypdf can read it
    temp_path = f"/tmp/{filename}"
    file.save(temp_path)
 
    try:
        text = read_file(temp_path)
        word_count = len(text.split())
        return jsonify({
            "text": text,
            "filename": filename,
            "word_count": word_count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
 
 
@app.route("/ask-doc", methods=["POST"])
def ask_doc():
    """
    Receives a question + document text from JavaScript.
    Returns the AI's answer as JSON.
    """
    data = request.get_json()
    question = data.get("question", "").strip()
    doc_text = data.get("doc_text", "").strip()
 
    if not question:
        return jsonify({"error": "No question provided"}), 400
    if not doc_text:
        return jsonify({"error": "No document loaded"}), 400
 
    # Trim doc to ~6000 words so it fits in Ollama's context window
    words = doc_text.split()
    doc_chunk = " ".join(words[:6000])
 
    system = (
        "You are a helpful document assistant. Answer questions based ONLY on the "
        "document content the user provides. Be clear, concise, and direct. "
        "If the answer is not in the document, say so honestly."
    )
    prompt = f"Document:\n\n{doc_chunk}\n\n---\n\nQuestion: {question}"
    answer = ask_ollama(prompt, system)
 
    return jsonify({"answer": answer})
 
 
@app.route("/scan-folder", methods=["POST"])
def scan_folder_route():
    """
    Receives a folder path, scans it, asks Ollama for an organization plan.
    Returns the plan as JSON.
    """
    data = request.get_json()
    folder = data.get("folder", "").strip()
 
    if not folder:
        return jsonify({"error": "No folder path provided"}), 400
    if not os.path.isdir(folder):
        return jsonify({"error": f"Folder not found: {folder}"}), 400
 
    groups = scan_folder(folder)
    total = sum(len(v) for v in groups.values())
 
    if total == 0:
        return jsonify({"error": "Folder is empty or unreadable"}), 400
 
    # Build a summary for Ollama
    ext_summary = "\n".join(
        f"  {ext}: {len(files)} files"
        for ext, files in sorted(groups.items(), key=lambda x: -len(x[1]))[:15]
    )
 
    system = (
        "You are a smart file organization assistant. Suggest a clean, practical "
        "folder structure. Format your response with clear folder names as headings "
        "and bullet points for what goes inside each folder. Be specific and concise."
    )
    prompt = (
        f"I have a folder with {total} files. File types found:\n\n"
        f"{ext_summary}\n\n"
        f"Suggest a clear folder structure to organize these files. "
        f"Give each folder a name and explain what belongs in it."
    )
    plan = ask_ollama(prompt, system)
 
    return jsonify({
        "plan": plan,
        "total": total,
        "types": len(groups),
        "breakdown": {ext: len(files) for ext, files in groups.items()}
    })
 
 
@app.route("/chat-organizer", methods=["POST"])
def chat_organizer():
    """
    Continues the organizer conversation.
    Receives full chat history from JavaScript, returns the next reply.
    """
    data = request.get_json()
    history = data.get("history", [])
 
    if not history:
        return jsonify({"error": "No conversation history"}), 400
 
    # Prepend a system message so Ollama knows its role
    system_msg = {
        "role": "system",
        "content": (
            "You are a helpful file organization assistant. The user has received an "
            "initial organization plan and wants to refine it. Be practical, specific, "
            "and concise. When they ask for changes, update the plan and show the new version."
        )
    }
    full_history = [system_msg] + history
    reply = chat_ollama(full_history)
 
    return jsonify({"reply": reply})
 
 
# ─────────────────────────────────────────────
# Start the server
# ─────────────────────────────────────────────
 
if __name__ == "__main__":
    print("\n  My Laptop Assistant is running!")
    print("  Open this in your browser: http://127.0.0.1:5000\n")
    app.run(debug=True)
 