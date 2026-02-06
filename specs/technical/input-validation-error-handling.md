# Input Validation and Error Handling — Technical Specification

- **x-tsid:** TS-InputValidationErrorHandling
- **x-fsid-links:**
  - FS-RejectEmptyRoomBody
  - FS-RejectMissingRequiredFields
  - FS-RejectInvalidFieldTypes
  - FS-RejectInvalidUpdateBody
  - FS-RejectInvalidRoomIdFormat
  - FS-ReturnStructuredErrorResponse
  - FS-DisplayErrorToastOnBackendError

## Overview

Add schema validation on backend write endpoints and a global error middleware. Add toast notifications on the frontend for backend error responses.

## Backend Validation Rules

### POST /rooms — DiscoveryData validation

Required string fields (must be present and typeof string):
- `discovery_id`
- `title`
- `goal`
- `date`

Required array fields (must be present and Array.isArray):
- `inputs`
- `facts`
- `insights`
- `recommendations`
- `outputs`

If body is empty/null/undefined → 400 with `{ "error": "Body is required" }`.
If any required field is missing or has wrong type → 400 with `{ "error": "Field \"<name>\" is required and must be a <type>" }`.

### POST /rooms/:id/update — Update body validation

Required fields:
- `payload` — must be a non-null object
- `senderUuid` — must be a string
- `username` — must be a string

If any is missing or wrong type → 400 with `{ "error": "Field \"<name>\" is required and must be a <type>" }`.

### UUID v4 validation on :id parameter

Routes: `GET /rooms/:id`, `DELETE /rooms/:id`, `POST /rooms/:id/update`.

The `:id` parameter must match UUID v4 format: `/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/`.

If invalid → 400 with `{ "error": "Invalid room ID format. Must be UUID v4." }`.

Reuse the existing `isRoomValid` function already in the codebase.

### Global error middleware

Express error handler as last middleware: `(err, req, res, next) => ...`
- Logs the error with winston.
- Returns 500 with `{ "error": "Internal server error" }`.
- Does not expose stack traces.

## Error Response Format

All error responses use:
```json
{ "error": "<human-readable message>" }
```

Content-Type: `application/json`.

## Frontend Toast

- Functional component `Toast` with props: `message: string | null`, `onClose: () => void`.
- Renders a fixed-position notification at the top of the viewport.
- Auto-dismisses after 5 seconds.
- Styled with a red/error background, white text.
- Rendered at `App.tsx` level, state passed from `Toolbar.tsx` via `onError` prop.
- `Toolbar.tsx` checks `response.ok` on all fetch calls and calls `onError(errorMessage)` on failure.
