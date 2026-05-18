export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="hero-badge">Lead Distribution Engine</div>
        <h1>
          Smart lead routing,<br />
          <span>built for fairness</span>
        </h1>
        <p>
          Customers submit service enquiries. Leads are automatically assigned to
          providers using mandatory rules, fair round-robin allocation, and
          real-time dashboards — with concurrency safety and webhook idempotency.
        </p>
        <div className="hero-actions">
          <a href="/request-service" className="btn btn-primary">Submit a Lead</a>
          <a href="/dashboard" className="btn btn-outline">Open Dashboard</a>
          <a href="/test-tools" className="btn btn-outline">Test Tools</a>
        </div>
      </div>

      <div className="features-section">
        <h2>How it works</h2>
        <div className="features">
          <div className="feature">
            <div className="feature-icon blue">⚡</div>
            <h3>Fair Allocation</h3>
            <p>
              Persistent round-robin counter stored in PostgreSQL ensures every
              provider gets equal leads over time. Not random — deterministic and
              auditable.
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon green">🔒</div>
            <h3>Concurrency Safe</h3>
            <p>
              Serializable database transactions prevent race conditions. Ten
              simultaneous leads won't corrupt allocation state or exceed quotas.
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon cyan">📡</div>
            <h3>Real-Time Updates</h3>
            <p>
              Server-Sent Events push new assignments to the dashboard instantly.
              No polling, no refresh — just live data.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
