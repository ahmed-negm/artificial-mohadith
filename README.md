# Artificial Mohadith (Obsidian Plugin)

Gemini-powered chat assistant inside Obsidian with a modern UI and powerful features.

## Features
- Modern, professional chat interface
- Multiple conversation support
- Streaming responses as you type
- Code syntax highlighting with copy button
- Context-aware conversations using your current note
- Markdown-rendered Gemini responses
- Message actions (copy, regenerate)
- Customizable theme (light, dark, or follow Obsidian)
- Keyboard shortcut: Cmd+Shift+G (Mac) / Ctrl+Shift+G (Win/Linux)

## Installation
1. Build the plugin (see below)
2. Copy folder to `.obsidian/plugins/artificial-mohadith`
3. Enable in **Settings → Community plugins**

## Build Instructions
```bash
npm init -y
npm install --save-dev esbuild
npm install @google/genai uuid
npm run build
```

Add to package.json:
```json
{
  "scripts": {
    "build": "esbuild src/main.ts --bundle --platform=browser --target=es2019 --format=cjs --outfile=main.js --external:obsidian"
  }
}
```

## Configure
- Go to **Settings → Artificial Mohadith**
- Enter Gemini API key, model, temperature
- Customize other settings:
  - System prompt
  - Streaming responses
  - Context awareness
  - UI theme
  - Code highlighting
  - Show timestamps
- Toggle panel with **Cmd+Shift+G**

## Usage
1. Open the sidebar panel using the command or keyboard shortcut
2. Type your message in the input box
3. Press Enter or click the send button
4. View the AI's response in real-time as it's generated
5. Use context-awareness toggle to include your current note's content
6. Create new conversations or switch between existing ones
7. Copy or regenerate responses as needed

## Dependencies
- @google/genai: For Gemini API integration
- uuid: For generating unique IDs

## Screenshots
(Screenshots will be added here)