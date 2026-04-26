export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Receipt Scan</p>
          <h1>Turn receipts into organized spending records.</h1>
          <p className="lede">
            Capture receipts, review extracted details, and keep a searchable
            history of purchases, categories, totals, and monthly trends.
          </p>
        </div>
      </section>

      <section className="workflow" aria-label="Core workflow">
        <article>
          <span>1</span>
          <h2>Capture</h2>
          <p>Upload or photograph a receipt from desktop or mobile.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Review</h2>
          <p>Confirm merchant, date, total, tax, and line-item extraction.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Track</h2>
          <p>Save expenses and analyze spending by category and month.</p>
        </article>
      </section>
    </main>
  );
}
