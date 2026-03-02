# Echo (Omniscience) 🎙️🧠

Echo is a powerful native desktop application built with **Tauri v2, React,
TypeScript, and Vite**. It is designed to act as an offline-first "Omniscience"
lecture recording and study hub. It captures live audio, generates a timestamped
transcript, and leverages AI to produce markdown notes, interactive flashcards,
quizzes, and Mermaid.js diagrams directly from your classes!

## 🚀 Features

- **Native Audio Capture**: Records microphone input using the browser's
  `MediaRecorder` API directly into highly compressed `.webm` binaries.
- **Offline Reliability**: Safely bypasses cloud database complexity by writing
  all data locally to your system's `Documents` folder using Rust's optimized
  filesystem APIs.
- **Study Hub & AI Generation**: Uses the **Nebius AI API** (Llama 3) to
  summarize massive transcripts using a recursive chunking pattern. Features
  custom Markdown parsing to render complex logical arrays into beautiful
  **Mermaid** SVG diagrams right inside your notes.
- **Flashcards & Quizzes**: Automatically converts transcript notes into
  interactive JSON-driven study flashcards.

---

## ⚠️ Disclosures and Technical Warnings

Before testing or contributing to this project, please be aware of the following
technical constraints unique to the Tauri Windows environment:

### 1. Tauri WebView2 Transcription Limits

**Live Voice-to-Text limitation on Windows.** The frontend attempts to use the
native browser `webkitSpeechRecognition` API. However, Tauri on Windows uses
**Edge WebView2**, which fundamentally does **not** support the proprietary
Chrome Web Speech APIs.

- _Impact:_ Live semantic transcription will fail silently and return empty
  arrays on Windows.
- _Workaround:_ The `StudyHub` error-guards have been disabled, allowing you to
  manually type a prompt or test the AI notes/diagram generation using fallback
  placeholder text.

### 2. FileSystem Security Escalations

Modern Windows OS (specifically setups with OneDrive Sync enabled on the
`Documents` folder) inherently blocks isolated AppContainers from crossing
junction borders. To allow saving the lectures directly to your physical hard
drive seamlessly, this app was elevated with:

- `"fs:scope-home-recursive"`
- `"fs:allow-write-text-file"` _(Located in
  `src-tauri/capabilities/default.json`)_. This acts as a master-key bypassing
  the Tauri v2 scope sandbox. It natively targets your underlying
  `dirs::document_dir()` mapping.

### 3. File Sizes and Storage

Because the application records rich `.webm` opus-encoded audio straight to your
`Documents/echo` folder, be mindful that recording multi-hour lectures will
generate large binary files. Keep an eye on your local storage (and OneDrive
upload caps).

---

## 🛠️ Setup Instructions

### Prerequisites

1. Ensure you have **Node.js** and **npm** installed.
2. Install the **Rust** toolchain (`rustup`).
3. Have the **Visual Studio C++ Build Tools** installed on Windows for Rust
   compilation.

### Setting up the Environment

You must configure your API keys for the AI Study Hub to function. Create a file
named `.env` in the root of the project folder:

```text
VITE_NEBIUS_API_KEY=your_nebius_api_key_here
```

_(Note: The actual `.env` file should be explicitly ignored in `.gitignore` to
prevent credential leaking)._

### Running in Development

```bash
npm install
npm run tauri dev
```

### Compiling a Local Windows Release

To compile the raw code into a native Windows `.exe` installer right on your
computer:

```bash
npm run tauri build
```

Once completed, your installer will be located in:
`src-tauri/target/release/bundle/msi/`

### ☁️ Compiling for macOS & Linux (GitHub Actions)

This repository includes a fully-automated cross-platform build pipeline. To
generate macOS `.dmg`, Linux `.deb`, and Windows `.exe` installers
simultaneously without needing the physical hardware:

1. Commit all your latest code to your repository:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
2. Create an official Git Version Tag:
   ```bash
   git tag v1.0.0
   ```
3. Push the tag to GitHub to trigger the cloud servers:
   ```bash
   git push origin v1.0.0
   ```
4. Navigate to the **"Actions"** tab on your GitHub repository. You will see
   three separate cloud instances (macOS, Ubuntu, and Windows) compiling your
   code. Once finished, they will automatically attach the compiled,
   ready-to-use application installers to your **GitHub Releases** page as a new
   Draft!

---

_Developed using Tauri, React, Zustand, and TailwindCSS._
