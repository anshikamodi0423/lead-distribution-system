export default function Home() {
  return (
    <div className="home-hero">
      <h1>Prowider</h1>
      <p className="subtitle">
        A lead distribution system that automatically assigns customer enquiries
        to providers using mandatory rules and fair round-robin allocation — with
        real-time dashboards, concurrency safety, and webhook idempotency.
      </p>
      <div className="home-links">
        <a href="/request-service">Submit a Lead</a>
        <a href="/dashboard" className="secondary">Provider Dashboard</a>
        <a href="/test-tools" className="secondary">Test Tools</a>
      </div>

      <div className="features">
        <div className="feature">
          <div className="feature-icon">⚡</div>
          <h3>Fair Allocation</h3>
          <p>Persistent round-robin ensures every provider gets equal leads over time</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🔒</div>
          <h3>Concurrency Safe</h3>
          <p>Serializable transactions prevent race conditions under simultaneous load</p>
        </div>
        <div className="feature">
          <div className="feature-icon">📡</div>
          <h3>Real-Time</h3>
          <p>SSE-powered dashboard updates instantly when new leads are assigned</p>
        </div>
      </div>
    </div>
  );
}
