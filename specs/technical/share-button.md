# Share Button — Technical Specification

- **x-tsid:** TS-ShareButton
- **x-fsid-links:**
  - FS-ShareButtonShownForSavedDiscovery
  - FS-ShareButtonHiddenForUnsavedDiscovery
  - FS-ShareDialogShowsDiscoveryLink
  - FS-ShareDialogCopiesLink
  - FS-ShareButtonAppearsAfterFirstSave

## Overview

Frontend only. No backend route, HTTP contract or SSE message changes: the link
is built from the document id the toolbar already holds.

## Behavior

| Element | Rule |
| --- | --- |
| Share button | In `Toolbar.tsx`, rendered when `documentId` is set (a saved discovery), for anonymous and signed-in Analysts alike. Icon `faShareNodes`, `title="Share"`. |
| Share dialog | `ShareModal.tsx` (the existing, unused `StartEventRoomModal.tsx`, renamed). Heading `Share Discovery`; read-only field labelled `Discovery link` holding `${window.location.origin}/documents/<documentId>`. |
| Copy | Copy control (`title="Copy link"`) writes the link with `navigator.clipboard.writeText`; the control turns into a check mark with `title="Copied!"` for 2 s. |
| After first save | `handleSave` already sets `documentId` from the `POST /documents` response, so the button appears without a reload. |

The link is the UI route `/documents/<id>`, which opens the application since
the `/api/` prefix fix (`decisions/20261102-PrefixBackendApiPath.md`).

## Error handling

If the clipboard is unavailable (insecure context, permission denied) the copy
control stays as it was and the field remains selectable for a manual copy; no
error toast.

## Tests

`tests/e2e/share-button.spec.ts` (Playwright): the backend is stubbed with
`page.route`, the clipboard is read back with `navigator.clipboard.readText`
under granted clipboard permissions.
