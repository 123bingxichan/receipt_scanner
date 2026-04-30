"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  formatUsd,
  generateMockExtraction,
  generateMockExtractionFromFile,
  receiptToCsv
} from "@/lib/receipt-utils";
import { ItemCategory, NecessityLevel, ReceiptItem, ReceiptRecord } from "@/lib/types";

const STORAGE_KEY = "receipt-scan-v1";

const CATEGORY_OPTIONS: ItemCategory[] = [
  "produce",
  "pantry",
  "junk_food",
  "household",
  "protein",
  "dairy",
  "beverage",
  "other"
];

const NECESSITY_OPTIONS: NecessityLevel[] = ["necessary", "non_necessary", "unknown"];

export function ReceiptDashboardApp() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [draft, setDraft] = useState<ReceiptRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastImportedFile, setLastImportedFile] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ReceiptRecord[];
      setReceipts(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  }, [receipts]);

  const monthlyTotal = useMemo(
    () => receipts.reduce((sum, receipt) => sum + receipt.totalCents, 0),
    [receipts]
  );

  const spendByCategory = useMemo(() => {
    const categoryMap = new Map<ItemCategory, number>();
    receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + item.lineTotalCents);
      });
    });
    return Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [receipts]);

  const spendByNecessity = useMemo(() => {
    const counts: Record<NecessityLevel, number> = {
      necessary: 0,
      non_necessary: 0,
      unknown: 0
    };
    receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        counts[item.necessity] += item.lineTotalCents;
      });
    });
    return counts;
  }, [receipts]);

  const merchantSpend = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach((receipt) => {
      map.set(receipt.merchant, (map.get(receipt.merchant) ?? 0) + receipt.totalCents);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [receipts]);

  const filteredItems = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const all = receipts.flatMap((receipt) =>
      receipt.items.map((item) => ({ receipt, item }))
    );
    if (!normalized) return all;
    return all.filter(({ item }) => item.name.toLowerCase().includes(normalized));
  }, [receipts, searchTerm]);

  async function onFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    const extracted = await generateMockExtractionFromFile(file);
    setLastImportedFile(file.name);
    setUploadMessage(
      "Receipt image loaded. This MVP uses mocked OCR extraction, so please review and edit before saving."
    );
    setDraft({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...extracted
    });
    setIsScanning(false);
    event.target.value = "";
  }

  function openUploadPicker() {
    uploadInputRef.current?.click();
  }

  function openCameraCapture() {
    cameraInputRef.current?.click();
  }

  function loadSampleReceipt() {
    const extracted = generateMockExtraction("sample-grocery-receipt.jpg");
    setLastImportedFile("sample-grocery-receipt.jpg");
    setUploadMessage(
      "Loaded sample receipt. You can edit merchant, items, costs, categories, and necessity before saving."
    );
    setDraft({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...extracted
    });
  }

  function updateDraftItem(itemId: string, patch: Partial<ReceiptItem>) {
    setDraft((current) => {
      if (!current) return current;
      const nextItems = current.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      );
      return {
        ...current,
        items: nextItems,
        totalCents: nextItems.reduce((sum, item) => sum + item.lineTotalCents, 0)
      };
    });
  }

  function saveDraft() {
    if (!draft) return;
    setReceipts((current) => [draft, ...current]);
    setDraft(null);
  }

  function downloadCsv() {
    const csv = receiptToCsv(receipts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `receipt-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="hero-block">
        <div>
          <p className="eyebrow">Receipt Scan MVP</p>
          <h1>Track ingredient costs and necessity spending.</h1>
          <p className="lede">
            Upload or capture receipt photos, correct line-item extraction, classify groceries,
            and export data for future GPT cost-per-dish analysis.
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>1) Upload receipt image</h2>
        <p className="hint">
          Use Upload for existing images, or Camera to take a new photo on mobile.
          OCR is mocked in this MVP, so review/edit extracted rows before saving.
        </p>
        <div className="upload-row">
          <button type="button" onClick={openUploadPicker}>
            Upload receipt
          </button>
          <button type="button" onClick={openCameraCapture}>
            Scan with camera
          </button>
          <button type="button" onClick={loadSampleReceipt}>
            Load sample
          </button>
          <button type="button" onClick={downloadCsv} disabled={receipts.length === 0}>
            Export CSV
          </button>
        </div>
        {isScanning ? <p className="hint">Scanning receipt image now...</p> : null}
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
        {lastImportedFile ? <p className="hint">Last loaded file: {lastImportedFile}</p> : null}
        {uploadMessage ? <p className="hint">{uploadMessage}</p> : null}
      </section>

      {draft ? (
        <section className="panel">
          <h2>2) Review extracted items</h2>
          <div className="draft-meta">
            <label>
              Merchant
              <input
                value={draft.merchant}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, merchant: event.target.value } : current))
                }
              />
            </label>
            <label>
              Purchase time
              <input
                type="datetime-local"
                value={draft.purchasedAt.slice(0, 16)}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          purchasedAt: new Date(event.target.value).toISOString()
                        }
                      : current
                  )
                }
              />
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty / Weight</th>
                  <th>Cost (USD)</th>
                  <th>Category</th>
                  <th>Necessity</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        value={item.name}
                        onChange={(event) => updateDraftItem(item.id, { name: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={item.quantityText}
                        onChange={(event) => updateDraftItem(item.id, { quantityText: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(item.lineTotalCents / 100).toFixed(2)}
                        onChange={(event) =>
                          updateDraftItem(item.id, {
                            lineTotalCents: Math.round(Number(event.target.value || 0) * 100)
                          })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={item.category}
                        onChange={(event) =>
                          updateDraftItem(item.id, { category: event.target.value as ItemCategory })
                        }
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.necessity}
                        onChange={(event) =>
                          updateDraftItem(item.id, { necessity: event.target.value as NecessityLevel })
                        }
                      >
                        {NECESSITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="action-row">
            <strong>Draft total: {formatUsd(draft.totalCents)}</strong>
            <button type="button" onClick={saveDraft}>
              Save receipt
            </button>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary>View OCR output for this scan</summary>
            <pre>{draft.rawOcrText}</pre>
          </details>
        </section>
      ) : null}

      <section className="panel">
        <h2>3) Dashboard</h2>
        <div className="kpis">
          <article>
            <h3>Total tracked spend</h3>
            <p>{formatUsd(monthlyTotal)}</p>
          </article>
          <article>
            <h3>Necessary items</h3>
            <p>{formatUsd(spendByNecessity.necessary)}</p>
          </article>
          <article>
            <h3>Non-necessary items</h3>
            <p>{formatUsd(spendByNecessity.non_necessary)}</p>
          </article>
        </div>

        <div className="grid-2">
          <article>
            <h3>Spend by category</h3>
            <ul>
              {spendByCategory.length > 0 ? (
                spendByCategory.map(([category, cents]) => (
                  <li key={category}>
                    <span>{category}</span>
                    <strong>{formatUsd(cents)}</strong>
                  </li>
                ))
              ) : (
                <li>No data yet.</li>
              )}
            </ul>
          </article>
          <article>
            <h3>Merchant trends</h3>
            <ul>
              {merchantSpend.length > 0 ? (
                merchantSpend.map(([merchant, cents]) => (
                  <li key={merchant}>
                    <span>{merchant}</span>
                    <strong>{formatUsd(cents)}</strong>
                  </li>
                ))
              ) : (
                <li>No data yet.</li>
              )}
            </ul>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>4) Ingredient lookup</h2>
        <input
          placeholder="Search for onion, garlic, doritos..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Merchant</th>
                <th>Date</th>
                <th>Category</th>
                <th>Necessity</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map(({ receipt, item }) => (
                  <tr key={`${receipt.id}-${item.id}`}>
                    <td>{item.name}</td>
                    <td>{receipt.merchant}</td>
                    <td>{new Date(receipt.purchasedAt).toLocaleDateString()}</td>
                    <td>{item.category}</td>
                    <td>{item.necessity}</td>
                    <td>{formatUsd(item.lineTotalCents)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No items match yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>5) Saved receipts and OCR logs</h2>
        <p className="hint">
          Open a row to inspect the exact parsed output that was saved for each receipt scan.
        </p>
        {receipts.length === 0 ? (
          <p className="hint">No receipts saved yet.</p>
        ) : (
          receipts.map((receipt) => (
            <details key={receipt.id} style={{ marginTop: 10 }}>
              <summary>
                {receipt.merchant} · {new Date(receipt.purchasedAt).toLocaleString()} ·{" "}
                {formatUsd(receipt.totalCents)}
              </summary>
              <pre>{receipt.rawOcrText}</pre>
            </details>
          ))
        )}
      </section>
    </main>
  );
}
