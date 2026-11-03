# Share Button — Technical Specification

- **x-tsid:** TS-ShareButton
- **x-fsid-links:**
  - FS-ShareButtonShownForSavedDiscovery
  - FS-ShareButtonHiddenForUnsavedDiscovery
  - FS-ShareButtonCopiesLink
  - FS-ShareLinkShownWhenCopyFails
  - FS-ShareButtonAppearsAfterFirstSave

## Overview

Frontend only. No backend route, HTTP contract or SSE message changes: the link
is built from the document id the toolbar already holds.

## Behavior

| Element | Rule |
| --- | --- |
| Share button | In `Toolbar.tsx`, rendered when `documentId` is set (a saved discovery), for anonymous and signed-in Analysts alike. Icon `faShareNodes`, `title="Share"`. |
| Link | `${window.location.origin}/documents/<documentId>` — the UI route, which opens the application since the `/api/` prefix fix (`decisions/20261102-PrefixBackendApiPath.md`). |
| Copy | A click writes the link with `navigator.clipboard.writeText`, then shows the info toast `Link copied to clipboard` (the app's existing `Toast`, 5 s). |
| After first save | `handleSave` already sets `documentId` from the `POST /documents` response, so the button appears without a reload. |

No dialog: the former `ShareModal.tsx` is removed.

## Error handling

If the clipboard is unavailable (insecure context, permission denied, no
`navigator.clipboard`), the error toast `Could not copy the link: <link>` is
shown instead, so the link can still be copied by hand.

## Tests

`tests/e2e/share-button.spec.ts` (Playwright): the backend is stubbed with
`page.route`; the clipboard is read back with `navigator.clipboard.readText`
under granted clipboard permissions; the failure case replaces
`navigator.clipboard.writeText` with a rejecting stub.
