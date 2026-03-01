# TSrect-ocr

Single-page OCR web app powered by **Tesseract.js**.

## Features
- Bulk OCR for image files (JPG/PNG/WebP/BMP/etc.).
- OCR for PDF files, including multi-page PDFs.
- Progress indicator in `Processing X/Y` format.
- Supports OCR languages: **English + Hindi** (`eng+hin`).
- Save extracted output as a `.txt` file.
- Offline-ready runtime (no CDN usage at app runtime).

## Offline asset setup
The app is wired to use local files from:

- `vendor/tesseract/`
- `vendor/pdfjs/`
- `tessdata/`

To populate those files, run:

```bash
./scripts/fetch-offline-assets.sh
```

This downloads:

- `tesseract.min.js`, `worker.min.js`, and Tesseract wasm core files.
- `eng.traineddata.gz` and `hin.traineddata.gz` OCR language data.
- `pdf.min.mjs` and `pdf.worker.min.mjs`.

## Run locally
```bash
python3 -m http.server 8000
```
Then open:

- http://localhost:8000/index.html

> After assets are downloaded once into this repository, the app runs without internet.
