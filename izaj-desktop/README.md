# Izaj Desktop Application

## Automated Tauri Version Bumps

Every time you run `npm run tauri:build`, the `scripts/bump-tauri-version.mjs` helper will:

- Read the current `src-tauri/tauri.conf.json` version.
- Increment the patch number (e.g., `1.0.2` → `1.0.3`).
- Update any window titles that end with a `vMAJOR.MINOR.PATCH` suffix so the UI stays in sync.

If you need a different version before building (say a minor or major bump), manually edit the value in `src-tauri/tauri.conf.json` and the script will continue from there on the next build.
