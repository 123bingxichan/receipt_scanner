"use client";

import { ChangeEvent, useRef, useState } from "react";

interface OcrLine {
  text: string;
}

interface OcrApiResponse {
  fullText: string;
  lines: OcrLine[];
}

export function ReceiptDashboardApp() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [lastFileName, setLastFileName] = useState("");
  const [ocrResult, setOcrResult] = useState<OcrApiResponse | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function onFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setIsScanning(true);
    setLastFileName(file.name);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: payload
      });

      const data = await response.json();

      if (!response.ok) {
        setOcrResult(null);
        setError(String(data?.error ?? "OCR request failed"));
      } else {
        setOcrResult(data as OcrApiResponse);
      }
    } catch (scanError) {
      setOcrResult(null);
      setError(scanError instanceof Error ? scanError.message : "Unexpected scan error");
    } finally {
      setIsScanning(false);
      event.target.value = "";
    }
  }

  return (
    <main className="app-shell">
      <header className="hero-block">
        <div>
          <p className="eyebrow">Receipt OCR</p>
          <h1>Scan receipts and inspect real OCR output.</h1>
          <p className="lede">
            Upload an image or open the camera on mobile. The extracted OCR text is shown below
            and loaded directly into this website.
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>Scan receipt</h2>
        <div className="upload-row">
          <button type="button" onClick={() => uploadInputRef.current?.click()}>
            Upload image
          </button>
          <button type="button" onClick={() => cameraInputRef.current?.click()}>
            Scan with camera
          </button>
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={onFileUpload}
          style={{ display: "none" }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileUpload}
          style={{ display: "none" }}
        />

        {lastFileName ? <p className="hint">Last scanned file: {lastFileName}</p> : null}
        {isScanning ? <p className="hint">Scanning in progress…</p> : null}
        {error ? <p className="hint">OCR error: {error}</p> : null}
      </section>

      <section className="panel">
        <h2>OCR output</h2>
        {!ocrResult ? (
          <p className="hint">No OCR result yet. Scan a receipt image first.</p>
        ) : (
          <>
            <h3>Full text</h3>
            <pre>{ocrResult.fullText}</pre>

            <h3 style={{ marginTop: 12 }}>Detected lines</h3>
            <ol>
              {ocrResult.lines.map((line, index) => (
                <li key={`${index}-${line.text}`}>{line.text}</li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}
