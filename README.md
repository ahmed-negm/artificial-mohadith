# Artificial Mohadith (Obsidian Plugin)

Gemini-powered chat assistant inside Obsidian.

## Features
- Right sidebar panel for chat
- Markdown-rendered Gemini responses
- Settings: API key, model, temperature
- Keyboard shortcut: Cmd+Shift+G (Mac) / Ctrl+Shift+G (Win/Linux)

## Installation
1. Build the plugin (see below)
2. Copy folder to `.obsidian/plugins/artificial-mohadith`
3. Enable in **Settings → Community plugins**

## Build Instructions
```bash
npm init -y
npm install --save-dev esbuild
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
- Toggle panel with **Cmd+Shift+G**