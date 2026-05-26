# My Laptop Assistant - An Automation/AI Project
### Steps to run:
1. Install Python dependencies - Open a terminal, navigate into the project folder, and run:
> ``` pip install flask ollama pypdf ```

2. Start Ollama - open a separate terminal window and run:
> ```ollama run llama3.2```

Leave this running in the background the whole time you use the app.

3. Start the Flask server - back in your project terminal run:
> ```python app.py```

You'll see: ``` Running on http://127.0.0.1:5000 ```

4. Open your browser and go to:
> ``` http://127.0.0.1:5000 ```

### Technology Stack
+ Python - Hanldes all the logic of reading files, scanning folders, talking to Ollama, and serving the app. Specifically uses Flask, a lightweight Python librabry that turns my script into a web server.
+ Flask - When JavaScript sends a question, Flask receives it, runs the Python code, and sends answer back
+ HTML - Defines the structure of every page. Three files: index.html, doc.html, organizer.html.
+ CSS - Controls colors, layout, animations, fonts, chat bubbles.
+ JavaScript - Makes pages interactive. When a questions is typed and send is clicked, JS captures that, sends it to Flask using fetch(), waits for the answer, and puts it on screen. Three files: script.js (shared utilities), doc.js (document page logic), organizer.js (organizer page logic).
+ Ollama - AI engine. Runs entirely on the laptop. Flask talks to it using the ollama Python library. It's what actually reads the documents and answers questions or generates the organization plan.
