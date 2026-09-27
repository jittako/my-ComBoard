# Copilot instructions for my-ComBoard

## Project overview
This repository is a small browser-based AAC (augmentative and alternative communication) app for Japanese speech. The app is intentionally static: there is no backend, no framework, and no bundler.

The core files are:
- `index.html`: page structure and app layout
- `style.css`: all visual styling, layout rules, and theme tokens
- `script.js`: behavior, data model, UI rendering, persistent storage, and speech synthesis logic

## Build, test, and lint
No package manager, build tool, lint config, or automated test runner is configured in this repository.

- Build: none (`index.html` is loaded directly in a browser; no bundling step)
- Test: none (`package.json` is absent, and no test files or JS test runner are present)
- Lint: none (no ESLint, Prettier, or comparable config is present)

For local preview, serve the folder statically from the repo root:

```bash
cd /workspaces/my-ComBoard
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Architecture and behavior
The app is structured around a single-page UI driven by DOM generation in `script.js`.

- `categories` is the source of truth for available vocabulary groups and their default words.
- `renderCategories()` builds the category tabs.
- `renderWords()` rebuilds the word grid for the active category and merges built-in words with custom words stored in `localStorage`.
- `selectedWords` tracks the current message board state.
- `setPlaybackMode()` switches between `compose` and `direct` modes and updates the visible message area accordingly.
- `speakText()` and `speakMessage()` use the browser Web Speech API (`speechSynthesis`) to speak Japanese text.
- `saveCustomWord()` persists new custom entries in browser localStorage so they survive refreshes on the same device.

A key architectural constraint is that the app remains purely client-side and browser-local. When changing behavior, assume there is no server-side validation or persistence layer.

## Key conventions specific to this repo
- Keep the project as vanilla HTML/CSS/JS; avoid adding a framework or build pipeline unless the repository explicitly grows beyond this static-app pattern.
- Preserve the existing Japanese UX text and AAC terminology; the app is designed around Japanese phrase building and screen-reader-friendly buttons.
- Custom storage is versioned in `localStorage` keys (for example `aac-custom-words-v1` and `aac-playback-mode-v1`). Keep that naming pattern stable when adding or changing stored state.
- When adding new vocabulary groups, update the `categories` array in `script.js` and keep `categoryId` values consistent with the validation checks in `loadCustomWords()`.
- If you alter speech behavior, keep the `speechSynthesis` guard checks (`if ('speechSynthesis' in window ...)`) so the app still works on browsers without speech support.
- The app uses the browser dialog element (`<dialog>`) for settings and expects keyboard-friendly button states and `aria-*` attributes to remain consistent.

## Editing guidance
- Prefer small, direct changes in `script.js` for logic, and `style.css` for presentation tweaks.
- When modifying message or playback behavior, verify both `compose` and `direct` modes still work correctly.
- Preserve the existing local-only persistence model unless there is a project-level decision to add a backend or sync layer.
