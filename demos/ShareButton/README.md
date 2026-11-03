# Demo — Share Button (M26)

## Try it
1. Open https://factly.betafactory.co and open, or save, a discovery.
2. Click the Share icon in the toolbar (next to Save).
3. A message says "Link copied to clipboard".
4. Paste the link in a private window: the same discovery opens.

## Implemented
- Share button on every saved discovery, for anonymous and signed-in analysts
- One click copies the discovery link and confirms it with a message — no dialog
- The button appears right after the first save, without a reload

## Not implemented (non-goals)
- Per-person access rights, link expiry or revocation
- Sending the link by email or to a chat tool

## Limitations
- Without clipboard access (plain HTTP, permission denied) the message says the
  link could not be copied and shows it, to copy by hand.
