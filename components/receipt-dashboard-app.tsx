"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

interface ParsedItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
}

interface OcrApiResponse {
  fullText: string;
  merchant: string | null;
  purchasedAt: string | null;
  items: ParsedItem[];
}

interface SavedReceipt extends OcrApiResponse {
  id: string;
  createdAt: string;
  rawText: string;
}

export function ReceiptDashboardApp() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastFileName, setLastFileName] = useState("");
  const [ocrResult, setOcrResult] = useState<OcrApiResponse | null>(null);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadReceipts();
  }, []);

  async function loadReceipts() {
    const response = await fetch("/api/receipts");
    const data = await response.json();
    setSavedReceipts(data.receipts ?? []);
  }

  async function onFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setIsScanning(true);
    setLastFileName(file.name);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await fetch("/api/ocr", { method: "POST", body: payload });
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

  async function saveExtractedReceipt() {
    if (!ocrResult) return;
    setIsSaving(true);
    setError("");

    const response = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: ocrResult.merchant,
        purchasedAt: ocrResult.purchasedAt,
        rawText: ocrResult.fullText,
        items: ocrResult.items
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setError(String(data?.error ?? "Failed to save receipt"));
      setIsSaving(false);
      return;
    }

    setSavedReceipts((current) => [data.receipt as SavedReceipt, ...current]);
    setIsSaving(false);
  }

  function exportOcrCsv() {
    if (!ocrResult) return;
    const rows = [
      ["description", "quantity", "unit_price", "line_total"],
      ...ocrResult.items.map((item) => [
        item.description,
        item.quantity?.toString() ?? "",
        item.unitPrice?.toFixed(2) ?? "",
        item.lineTotal?.toFixed(2) ?? ""
      ])
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-items-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="hero-block">
        <p className="eyebrow">Receipt Scanner</p>
        <h1>Upload receipt → OCR extract → save purchased items.</h1>
      </header>

      <section className="panel">
        <h2>1) Upload receipt</h2>
        <div className="upload-row">
          <button type="button" onClick={() => uploadInputRef.current?.click()}>
            Upload image
          </button>
          <button type="button" onClick={saveExtractedReceipt} disabled={!ocrResult || isSaving}>
            {isSaving ? "Saving..." : "Save extracted items"}
          </button>
          <button type="button" onClick={exportOcrCsv} disabled={!ocrResult}>
            Export CSV
          </button>
        </div>
        <input ref={uploadInputRef} type="file" accept="image/*" onChange={onFileUpload} style={{ display: "none" }} />
        {lastFileName ? <p className="hint">Last scanned file: {lastFileName}</p> : null}
        {isScanning ? <p className="hint">Scanning in progress…</p> : null}
        {error ? <p className="hint">Error: {error}</p> : null}
      </section>

      <section className="panel">
        <h2>2) OCR extracted data</h2>
        {!ocrResult ? (
          <p className="hint">Upload a receipt to extract item rows.</p>
        ) : (
          <>
            <p className="hint">Merchant: {ocrResult.merchant ?? "Unknown"}</p>
            <p className="hint">Purchased at: {ocrResult.purchasedAt ?? "Unknown"}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Description</th><th>Qty</th><th>Unit Price</th><th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ocrResult.items.map((item, idx) => (
                    <tr key={`${item.description}-${idx}`}>
                      <td>{item.description}</td>
                      <td>{item.quantity ?? ""}</td>
                      <td>{item.unitPrice?.toFixed(2) ?? ""}</td>
                      <td>{item.lineTotal?.toFixed(2) ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary>View full OCR text</summary>
              <pre>{ocrResult.fullText}</pre>
            </details>
          </>
        )}
      </section>

      <section className="panel">
        <h2>3) Saved extracted items (with date)</h2>
        {savedReceipts.length === 0 ? <p className="hint">No saved receipts yet.</p> : null}
        {savedReceipts.map((receipt) => (
          <details key={receipt.id} style={{ marginTop: 10 }}>
            <summary>
              {receipt.merchant ?? "Unknown merchant"} · {receipt.purchasedAt ?? "Unknown date"} · saved {new Date(receipt.createdAt).toLocaleString()}
            </summary>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
                <tbody>
                  {receipt.items.map((item, idx) => (
                    <tr key={`${receipt.id}-${idx}`}>
                      <td>{item.description}</td>
                      <td>{item.quantity ?? ""}</td>
                      <td>{item.unitPrice?.toFixed(2) ?? ""}</td>
                      <td>{item.lineTotal?.toFixed(2) ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}

function escapeCsv(value: string): string {
  const escaped = value.replaceAll("\"", "\"\"");
  return escaped.includes(",") || escaped.includes("\"") ? `"${escaped}"` : escaped;
}
