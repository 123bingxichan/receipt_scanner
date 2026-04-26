# Storage Layer

Receipt images should be stored behind a small storage adapter.

Start with local storage for development, then add an S3-compatible implementation before production.

The app should store:

- Original receipt image.
- Optional normalized image used for OCR.
- Metadata such as MIME type, size, checksum, and owner user ID.
