# TODO

## Intent
Deliver M9: Input Validation and Error Handling — backend rejects malformed requests, frontend shows error toasts.

## Preconditions
- M1–M8: Delivered
- Acceptance tests pass (12 suites, 26 passed, 43 todo)
- Traceability check passes
- Spec lint passes

## Tasks
- [x] Write functional spec for M9 (7 FSIDs: FS-RejectEmptyRoomBody, FS-RejectMissingRequiredFields, FS-RejectInvalidFieldTypes, FS-RejectInvalidUpdateBody, FS-RejectInvalidRoomIdFormat, FS-ReturnStructuredErrorResponse, FS-DisplayErrorToastOnBackendError)
- [x] Write technical spec for M9 (TS-InputValidationErrorHandling + updated OpenAPI with 400 responses and ErrorResponse schema)
- [x] Write acceptance tests for M9 (8 tests, all pass)
- [x] Implement backend: validateDiscoveryData, validateUpdateBody, UUID validation on :id routes, global error middleware
- [x] Implement frontend: Toast component, onError prop in Toolbar, response.ok checks on all fetch calls
- [x] Refactoring: cleanup console.error replacements, verify no stack trace leaks
- [x] All acceptance tests pass (12 suites, 26 passed, 43 todo)
- [x] spec_lint: OK
- [x] traceability_check: OK
- [ ] Demo and user validation

## Validation
- All acceptance tests pass
- `tools/spec-lint/spec_lint.sh` passes
- `tools/traceability/traceability_check.sh` passes

## Done when
- Backend rejects empty/malformed POST /rooms with 400
- Backend rejects invalid update bodies with 400
- Backend rejects non-UUID :id parameters with 400
- All error responses are structured JSON { error: string }
- Frontend displays toast on backend errors
- All CI gates green
- User validation complete
