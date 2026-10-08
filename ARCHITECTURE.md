# Extension architecture

The extension follows a small MV3 modular design.

## Components

- `manifest.json`: defines MV3 permissions and extension entry points.
- `src/background/service-worker.js`: privileged coordinator for API calls and actions.
- `src/popup/popup.js`: UI logic for translation controls and status.
- `src/options/options.js`: settings management page.
- `src/shared/*`: shared utilities, storage access, API wrappers, translation logic.
- `src/content/content-script.js`: page extraction and DOM cleanup logic.

## Trust boundaries

- User input and API key storage are in the browser extension context.
- The popup and options page are trusted extension surfaces.
- The page DOM is untrusted; content extraction is minimized and scrubbed.
- The Gemini API is an external trust boundary; model and output validation are required.

## Message model

- Popup ⇒ Background: translation requests, settings updates, API key config
- Background ⇒ Popup: model list, success/failure results
- Background uses `chrome.scripting.executeScript` for user-triggered page extraction

## Data flow

1. User enters API key in options page.
2. Background initializes Gemini client with the stored key.
3. Popup requests available models from background.
4. User selects source/target languages and model.
5. Page or file content is extracted or uploaded.
6. Gemini API is called with a carefully constructed prompt.
7. Result is returned to the popup and shown to the user.
