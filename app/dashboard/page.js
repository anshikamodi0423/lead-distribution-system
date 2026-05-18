"use client";

import { useState, useEffect, useRef } from "react";

export default function Dashboard() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data);
    } catch (err) {
      console.error("Failed to fetch providers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    const es = new EventSource("/api/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = () => fetchProviders();
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading dashboard...</div>;

  const totalLeads = providers.reduce((a, p) => a + p.currentCount, 0);
  const totalQuota = providers.reduce((a, p) => a + p.monthlyQuota, 0);
  const atCapacity = providers.filter((p) => p.currentCount >= p.monthlyQuota).length;
  const avgLoad = totalQuota > 0 ? ((totalLeads / totalQuota) * 100).toFixed(0) : 0;

  return (
    <div>
      <div className="dash-top">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Provider Dashboard</h1>
          <p>Real-time view of lead assignments and quota usage</p>
        </div>
        <div className="dash-top-right">
          <div className="live-badge">
            <span className="live-dot" style={{ background: connected ? "#10b981" : "#9ca3af" }} />
            {connected ? "Live" : "Connecting..."}
          </div>
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-card">
          <div className="label">Total Leads</div>
          <div className="value">{totalLeads}</div>
        </div>
        <div className="summary-card">
          <div className="label">Providers</div>
          <div className="value">{providers.length}</div>
        </div>
        <div className="summary-card">
          <div className="label">Avg Load</div>
          <div className="value">{avgLoad}%</div>
        </div>
        <div className="summary-card">
          <div className="label">At Capacity</div>
          <div className="value">{atCapacity}</div>
        </div>
      </div>

      <div className="providers-grid">
        {providers.map((p) => {
          const pct = (p.currentCount / p.monthlyQuota) * 100;
          const level = pct >= 100 ? "full" : pct >= 70 ? "low" : "ok";
          return (
            <div key={p.id} className="provider-card">
              <div className="provider-card-header">
                <span className="provider-name">{p.name}</span>
                <span className={`quota-badge quota-${level}`}>
                  {p.remainingQuota} remaining
                </span>
              </div>
              <div className="quota-bar-track">
                <div className={`quota-bar-fill ${level}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="provider-stats">
                <span>Received: <strong>{p.currentCount}</strong></span>
                <span>Quota: <strong>{p.monthlyQuota}</strong></span>
                <span>Usage: <strong>{pct.toFixed(0)}%</strong></span>
              </div>
              <div className="provider-leads">
                {p.leads.length > 0 ? (
                  <ul className="lead-list">
                    {p.leads.map((l) => (
                      <li key={l.id} className="lead-item">
                        <div className="lead-row">
                          <span><span className="lead-name">{l.name}</span> — {l.phone}, {l.city}</span>
                          <span className="lead-service">{l.service}</span>
                        </div>
                        <div className="lead-meta">{new Date(l.assignedAt).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-leads">No leads assigned yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
