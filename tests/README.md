# Tests

Recommended test layout:

- `tests/unit`: validation, formatting, OCR parsing helpers.
- `tests/integration`: database and service workflows.
- `tests/e2e`: browser-level upload, review, and dashboard flows.

Start with unit tests around money handling and OCR result validation because mistakes there directly affect financial records.
