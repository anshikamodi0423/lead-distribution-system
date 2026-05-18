"use client";

import { useState } from "react";

export default function TestTools() {
  const [log, setLog] = useState([]);
  const addLog = (msg) => setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const resetQuota = async () => {
    addLog("Sending webhook: reset_quota...");
    const key = `reset_${Date.now()}`;
    try {
      const res = await fetch("/api/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_quota", idempotency_key: key }) });
      const data = await res.json();
      addLog(`✓ ${data.message}`);
    } catch (err) { addLog(`✕ Error: ${err.message}`); }
  };

  const testIdempotency = async () => {
    const key = `idemp_test_${Date.now()}`;
    addLog(`Testing idempotency — sending key "${key}" 5 times...`);
    const results = await Promise.all(
      Array(5).fill(null).map(() =>
        fetch("/api/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_quota", idempotency_key: key }) }).then(r => r.json())
      )
    );
    const processed = results.filter(r => r.message === "Quota reset successfully").length;
    const duped = results.filter(r => r.message === "Already processed (idempotent)").length;
    results.forEach((r, i) => addLog(`  Call ${i + 1}: ${r.message}`));
    addLog(processed <= 1 ? `✓ PASSED — ${processed} processed, ${duped} rejected` : `⚠ WARNING — processed ${processed} times`);
  };

  const generateBulk = async () => {
    addLog("Generating 10 leads simultaneously...");
    const ts = Date.now();
    const services = [1, 2, 3];
    const cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Pune"];
    const results = await Promise.allSettled(
      Array(10).fill(null).map((_, i) =>
        fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `User ${i + 1}`, phone: `${ts}${i}`, city: cities[i % 5], serviceId: services[i % 3], description: `Bulk test #${i + 1}` }) }).then(async r => ({ status: r.status, data: await r.json() }))
      )
    );
    let ok = 0, fail = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.status === 201) { ok++; addLog(`  Lead ${i + 1}: ✓ → ${r.value.data.assignedTo?.join(", ")}`); }
      else { fail++; addLog(`  Lead ${i + 1}: ✕ ${r.value?.data?.error || r.reason}`); }
    });
    addLog(`Done: ${ok} created, ${fail} failed`);
  };

  const fullReset = async () => {
    if (!confirm("Reset ALL data? This clears everything.")) return;
    addLog("Resetting all data...");
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    addLog(`✓ ${data.message}`);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Test Tools</h1>
        <p>Simulation panel for testing webhook idempotency, concurrency handling, and quota management</p>
      </div>

      <div className="tools-layout">
        <div className="tool-card">
          <h3><span className="tool-icon">🔄</span> Reset Quota (Webhook)</h3>
          <p>Simulates a payment gateway confirming subscription renewal. Resets all provider quotas to 10 via the webhook endpoint with a unique idempotency key.</p>
          <button className="btn btn-primary" onClick={resetQuota}>Reset Quota via Webhook</button>
        </div>

        <div className="tool-card">
          <h3><span className="tool-icon">🛡️</span> Idempotency Test</h3>
          <p>Sends the SAME webhook 5 times simultaneously with an identical idempotency key. Only the first should process — the rest must be rejected as duplicates.</p>
          <button className="btn btn-warning" onClick={testIdempotency}>Send 5 Identical Webhooks</button>
        </div>

        <div className="tool-card">
          <h3><span className="tool-icon">⚡</span> Concurrency Test</h3>
          <p>Creates 10 leads at the exact same time. Tests that the allocation engine handles simultaneous requests without data corruption or quota violations.</p>
          <button className="btn btn-primary" onClick={generateBulk}>Generate 10 Leads</button>
        </div>

        <div className="tool-card">
          <h3><span className="tool-icon">🗑️</span> Full Reset</h3>
          <p>Clears ALL leads, assignments, webhook logs, and resets round-robin counters to zero. Useful for starting a clean test run.</p>
          <button className="btn btn-danger" onClick={fullReset}>Reset Everything</button>
        </div>

        {log.length > 0 && (
          <div className="tool-card log-section">
            <div className="log-header">
              <h3><span className="tool-icon">📟</span> Execution Log</h3>
              <button className="btn btn-outline" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => setLog([])}>Clear</button>
            </div>
            <div className="log-box">{log.join("\n")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
