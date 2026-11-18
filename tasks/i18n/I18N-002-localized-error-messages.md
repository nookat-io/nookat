# [I18N-002] Translate error messages

- **Status:** Not started
- **Related:** I18N-001, UX-004

## Problem

Even with a translated UI, errors would still reach users in English, because the backend builds them as finished sentences.

## Current state

- Backend commands return errors as `String`, built with `format!` in the services and handlers, for example in `src-tauri/src/handlers/containers.rs`.
- Engine errors pass through `docker_message` in `src-tauri/src/services/docker_error.rs`, which returns the engine's own English text.
- The frontend shows those strings as they are, mostly in toasts through `errorMessage` calls.

## Scope

- Give backend errors a stable code and parameters, for example `container.start_failed` with the container name, instead of a finished sentence.
- Translate those codes in the frontend with the I18N-001 setup.
- Keep the engine's original message as a detail under the translated text, since it cannot be translated.

## Notes

- Depends on I18N-001.
- Changing the error type touches every command, so it can be done area by area.
