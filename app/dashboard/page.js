"use client";

import { useState, useEffect, useRef } from "react";

export default function Dashboard() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef(null);

  // Fetch providers data
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

  // Set up SSE connection for real-time updates
  useEffect(() => {
    fetchProviders();

    const eventSource = new EventSource("/api/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      // Received an update — refetch all provider data
      // This is simpler and more reliable than trying to patch state
      fetchProviders();
    };

    eventSource.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1>Provider Dashboard</h1>
        <div style={{ fontSize: 13, color: connected ? "#4caf50" : "#999" }}>
          <span className="live-dot" style={{ background: connected ? "#4caf50" : "#999" }} />
          {connected ? "Live" : "Connecting..."}
        </div>
      </div>
      <p className="subtitle">
        Real-time view of lead assignments per provider. Dashboard updates automatically when new leads are assigned.
      </p>

      <div className="providers-grid">
        {providers.map((provider) => {
          const quotaPercent = (provider.currentCount / provider.monthlyQuota) * 100;
          const quotaClass = quotaPercent >= 100 ? "quota-full" : quotaPercent >= 70 ? "quota-low" : "quota-ok";

          return (
            <div key={provider.id} className="provider-card">
              <div className="provider-header">
                <span className="provider-name">{provider.name}</span>
                <span className={`quota-badge ${quotaClass}`}>
                  {provider.remainingQuota} / {provider.monthlyQuota} remaining
                </span>
              </div>

              <div className="stats">
                <div className="stat">
                  Leads received: <strong>{provider.currentCount}</strong>
                </div>
                <div className="stat">
                  Quota used: <strong>{quotaPercent.toFixed(0)}%</strong>
                </div>
              </div>

              {provider.leads.length > 0 ? (
                <ul className="lead-list">
                  {provider.leads.map((lead) => (
                    <li key={lead.id} className="lead-item">
                      <div>
                        <strong>{lead.name}</strong> — {lead.phone}, {lead.city}{" "}
                        <span className="lead-service">{lead.service}</span>
                      </div>
                      <div className="lead-meta">
                        {new Date(lead.assignedAt).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: "#999", fontSize: 13, fontStyle: "italic" }}>
                  No leads assigned yet
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
