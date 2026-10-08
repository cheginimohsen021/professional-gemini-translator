# Security notes

This extension treats the API key and user content as sensitive data.

- Keep API keys in extension storage only.
- Do not hard-code keys into source or build output.
- Avoid sending unnecessary personal or private content to Gemini.
- Validate all messages and payloads before acting on them.
- Prefer narrow permissions and avoid broad host access.

The extension does not send telemetry or analytics by design.
