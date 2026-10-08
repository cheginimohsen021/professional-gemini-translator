# Professional Web & Document Translator

A Chrome extension for translating web pages and uploaded text files using your own Google Gemini API key.

## What it does

- Translate the current page using the selected Gemini model
- Translate uploaded `.txt`, `.md`, and `.html` files
- Discover available Gemini models dynamically from the official API
- Manage the API key in extension settings
- Minimal permissions: `storage`, `activeTab`, `tabs`, `scripting`

## Important limitations

- Page translation is limited to pages that Chrome allows the extension to access. Restricted pages like `chrome://`, `chrome-extension://`, and the Chrome Web Store cannot be translated.
- PDF and DOCX parsing are intentionally not implemented in this starter build because they require additional parsing libraries.
- The extension sends page text or uploaded text to Google Gemini for translation under your account and key.

## Project structure

- `manifest.json` — MV3 extension manifest
- `src/background/service-worker.js` — privileged logic, API calls, model discovery, message handling
- `src/popup/` — popup UI for translation actions
- `src/options/` — API key and settings screen
- `src/shared/` — storage, API client, model filtering, translation logic, file helpers
- `src/content/content-script.js` — content extraction script for page-based translation

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder

## Setup

1. Open the extension popup or the options page
2. Enter your Gemini API key
3. Select a source language, target language, and model
4. Choose `Translate Page` or `Translate File`

## Privacy notice

- The API key is stored in Chrome's local extension storage.
- Page text and uploaded file content are sent to Gemini only when you trigger a translation.
- This extension does not collect analytics or telemetry.

## Model discovery

The extension uses the official Google Gemini Models API to fetch available models, then filters them by `generateContent` capability and common text-model naming patterns.

## Local verification

This repository is created as a source-ready Chrome extension. It has not been run in a browser from this environment, so browser-level loading and runtime validation still need to be done locally.

## Recommended next step

Open the extension in Chrome and verify:

- API key saves and validates correctly
- Models populate from the API
- Page translation works on a normal website
- File translation works on text files
- Errors are shown clearly when the API key is invalid or blocked
