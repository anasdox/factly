# M9: Input Validation and Error Handling — Demo

## Scope
- Backend schema validation on POST /rooms and POST /rooms/:id/update
- UUID v4 validation on :id parameter (GET, DELETE, POST update)
- Global error middleware returning structured { error: string } JSON
- Frontend toast notifications for backend errors

## Not implemented
- Validation of nested entity content (items inside inputs, facts, etc.)
- Rate limiting or throttling
- Authentication or authorization

## Limitations
- Frontend toast is tested via manual demo only (no automated UI test)
- Toast disappears after 5 seconds (not configurable)

## Run

```bash
bash demos/InputValidationErrorHandling/demo.sh
```

The script starts the backend, sends invalid requests, and verifies 400 responses. For the frontend toast, follow the instructions printed at the end of the demo.
