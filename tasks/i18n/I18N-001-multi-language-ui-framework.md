# [I18N-001] Translate the UI

- **Status:** Partially done
- **Related:** I18N-002, I18N-003

## Problem

Nookat is English only.
Users who prefer another language cannot switch, even though Settings already has a language picker.

## Current state

- The config stores a language: `Language` with English (`en`) and Russian (`ru`) in `src-tauri/src/entities/config/i18n.rs` and `src/types/config.ts`.
- `get_language` and `update_language` are registered in `src-tauri/src/lib.rs`.
- The picker in `src/components/settings/general-settings.tsx` offers English only.
- After a change it says to restart the app, but nothing applies the saved language to the UI, before or after a restart.
- No i18n library is in `package.json`, and every UI string is hardcoded in the components.

## Scope

- Pick an i18n library and load translations based on the saved language.
- Move the UI strings into translation files, page by page.
- Switch the language without a restart, and remove the restart message.
- Add Russian, the second language the config already knows, and offer it in the picker once it is complete.
- Fail a check when a key exists in English but is missing in another language.

## Notes

- Open question: which library (for example i18next with react-i18next, or Lingui).
- Error messages from the backend are I18N-002, and date, number and size formats are I18N-003.
- Strings in the tray menu are built in Rust (`src-tauri/src/lib.rs`) and need their own translation path.
