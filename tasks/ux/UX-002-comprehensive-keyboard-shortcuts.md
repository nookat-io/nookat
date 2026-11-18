# [UX-002] Add keyboard shortcuts

- **Status:** Not started
- **Related:** UX-003

## Problem

Every action in Nookat needs the mouse.
People who manage containers all day expect to switch pages, search and act on selected rows from the keyboard.

## Current state

There are no app-wide shortcuts.
The only key handlers are local to two inputs: `src/components/images/common/docker-hub-search.tsx` and `src/components/images/common/tag-selector.tsx`.
The Radix primitives in `src/components/ui/` bring their built-in keys, such as Escape to close a dialog and arrow keys in menus.
`src-tauri/src/lib.rs` builds only the tray menu, so there is no app menu where shortcuts could show.

## Scope

- Switch between Containers, Images, Networks, Volumes and Settings from the keyboard, for example with Cmd/Ctrl+1 to 5 and Cmd/Ctrl+, for Settings.
- Focus the search field of the current page.
- Refresh the current list.
- Select all rows and delete the selected rows, with the usual confirmation.
- Open the create flows: new container, pull image and create network.
- Show a help sheet that lists every shortcut.
- List the shortcuts in an app menu with accelerators, so they are discoverable on macOS.
- Show the platform's modifier key (Cmd on macOS, Ctrl elsewhere) in labels.

## Notes

- Shortcuts must not fire while the user types in an input.
- Open question: whether users can remap shortcuts, which the original task asked for.
  Start with a fixed set.
- System-wide shortcuts that work while Nookat is in the background are out of scope.
