# Demo — Sign in with Pocket ID

## Implemented scope

Factly delegates sign-in to Pocket ID, a self-hosted passkey-based OIDC
provider running at `https://id.betafactory.co`.

- `GET /auth/providers` reports `pocketid`; the sign-in page renders the button
  from that list rather than from a hard-coded set.
- `GET /auth/pocketid` redirects to the provider with a single-use `state`,
  stored in an `HttpOnly; Secure; SameSite=Lax` cookie scoped to `/auth`.
- `GET /auth/pocketid/callback` checks the state in constant time, exchanges the
  code as form-encoded, reads `sub`/`preferred_username`/`email`, and finds or
  creates the account keyed on `(provider, sub)`.
- `POST /auth/register` is withdrawn, along with the sign-up UI on both the
  login page and the welcome screen.

## How to see it

1. Open https://factly.betafactory.co — "Sign in with Pocket ID" is on the
   login page and behind "Sign in" on the welcome screen.
2. Complete the passkey prompt at Pocket ID.
3. You return signed in as `pocketid:<your Pocket ID username>`.

Observable without a browser:

```bash
curl -s https://factly.betafactory.co/auth/providers
# {"providers":["pocketid"]}

curl -sD- -o /dev/null https://factly.betafactory.co/auth/pocketid | grep -i '^location:\|^set-cookie:'
# redirect to id.betafactory.co/authorize?...&state=...
# factly_oauth_state=...; Path=/auth; HttpOnly; Secure; SameSite=Lax

curl -s 'https://factly.betafactory.co/auth/pocketid/callback?code=x&state=forged'
# {"error":"Invalid or expired sign-in state"}
```

## Not implemented

- Single logout — signing out of Factly does not end the Pocket ID session.
- Groups and roles — Pocket ID groups are not read; every account has the same
  rights.
- Account linking — the same person arriving through two providers gets two
  accounts.
- GitHub and Google remain code paths only; no credentials are configured in
  production, so `/auth/providers` does not list them.

## Limitations

- Pocket ID is a single point of failure for sign-in, and its data volume
  (`pocketid_pocket-id-data`) holds every user and passkey enrolment. Back it up.
- Passkeys are bound to the origin `https://id.betafactory.co`. Changing that
  URL invalidates every enrolled passkey.
- Existing password accounts (`anas`) still work; there is no migration path
  from a password account to a Pocket ID identity — signing in through Pocket ID
  creates a separate account.
- The acceptance suite is red on `main` for reasons predating this feature
  (94 failures at baseline, unchanged by this branch). See TODO.md.
