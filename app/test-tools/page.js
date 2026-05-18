"use client";

import { useState } from "react";

export default function TestTools() {
  const [log, setLog] = useState([]);

  const addLog = (message) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // ---- Tool 1: Reset Quota via Webhook ----
  const resetQuota = async () => {
    addLog("Sending webhook: reset_quota...");
    const key = `reset_${Date.now()}`;
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_quota",
          idempotency_key: key,
        }),
      });
      const data = await res.json();
      addLog(`Response: ${data.message}`);
    } catch (err) {
      addLog(`Error: ${err.message}`);
    }
  };

  // ---- Tool 2: Test Idempotency ----
  const testIdempotency = async () => {
    const key = `idempotency_test_${Date.now()}`;
    addLog(`Testing idempotency with key: ${key}`);
    addLog("Sending same webhook 5 times simultaneously...");

    const promises = Array(5)
      .fill(null)
      .map((_, i) =>
        fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset_quota",
            idempotency_key: key,
          }),
        }).then((r) => r.json())
      );

    const results = await Promise.all(promises);
    results.forEach((r, i) => {
      addLog(`Call ${i + 1}: ${r.message}`);
    });

    const processed = results.filter((r) => r.message === "Quota reset successfully").length;
    const idempotent = results.filter((r) => r.message === "Already processed (idempotent)").length;
    addLog(`Result: ${processed} processed, ${idempotent} rejected as duplicate`);
    addLog(
      processed <= 1
        ? "✅ IDEMPOTENCY PASSED — webhook processed only once"
        : "⚠️ Check: webhook may have processed multiple times"
    );
  };

  // ---- Tool 3: Generate 10 Leads Simultaneously ----
  const generateBulkLeads = async () => {
    addLog("Generating 10 leads simultaneously...");

    const services = [1, 2, 3];
    const cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Pune"];
    const timestamp = Date.now();

    const promises = Array(10)
      .fill(null)
      .map((_, i) => {
        const serviceId = services[i % 3];
        return fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Test User ${i + 1}`,
            phone: `${timestamp}${i}`, // Unique phone per lead
            city: cities[i % 5],
            serviceId,
            description: `Bulk test lead #${i + 1} for Service ${serviceId}`,
          }),
        }).then(async (r) => {
          const data = await r.json();
          return { index: i + 1, status: r.status, data };
        });
      });

    const results = await Promise.allSettled(promises);
    let success = 0;
    let failed = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        const { index, status, data } = r.value;
        if (status === 201) {
          success++;
          addLog(`Lead ${index}: ✅ Created → ${data.assignedTo?.join(", ")}`);
        } else {
          failed++;
          addLog(`Lead ${index}: ❌ ${data.error}`);
        }
      } else {
        failed++;
        addLog(`Lead failed: ${r.reason}`);
      }
    });

    addLog(`Done: ${success} created, ${failed} failed`);
  };

  // ---- Tool 4: Full Reset ----
  const fullReset = async () => {
    if (!confirm("Reset ALL data? This clears all leads, assignments, and counters.")) return;
    addLog("Resetting all data...");
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      addLog(`Reset: ${data.message}`);
    } catch (err) {
      addLog(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <h1>Test Tools</h1>
      <p className="subtitle">
        Simulation panel for testing webhook idempotency, concurrency, and quota management.
      </p>

      <div className="tools-grid">
        {/* Webhook Quota Reset */}
        <div className="tool-card">
          <h3>1. Reset Provider Quota (Webhook)</h3>
          <p>
            Simulates a payment gateway confirming subscription. Resets all
            provider quotas to 10 via the webhook endpoint. Each call uses a
            unique idempotency key.
          </p>
          <button className="btn btn-primary" onClick={resetQuota}>
            Reset Quota via Webhook
          </button>
        </div>

        {/* Idempotency Test */}
        <div className="tool-card">
          <h3>2. Test Webhook Idempotency</h3>
          <p>
            Sends the SAME webhook 5 times simultaneously with the same
            idempotency key. Only the first call should process; the rest
            should be rejected as duplicates.
          </p>
          <button className="btn btn-warning" onClick={testIdempotency}>
            Send 5 Identical Webhooks
          </button>
        </div>

        {/* Bulk Lead Generation */}
        <div className="tool-card">
          <h3>3. Generate 10 Leads Simultaneously</h3>
          <p>
            Creates 10 leads at the same time to test concurrency handling.
            The allocation engine must handle simultaneous requests without
            data corruption or quota violations.
          </p>
          <button className="btn btn-primary" onClick={generateBulkLeads}>
            Generate 10 Leads
          </button>
        </div>

        {/* Full Reset */}
        <div className="tool-card">
          <h3>4. Full Data Reset</h3>
          <p>
            Clears ALL leads, assignments, webhook logs, and resets round-robin
            counters. Useful for starting fresh.
          </p>
          <button className="btn btn-danger" onClick={fullReset}>
            Reset Everything
          </button>
        </div>
      </div>

      {/* Log Output */}
      {log.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Execution Log</h3>
          <div className="log-box">{log.join("\n")}</div>
        </div>
      )}
    </div>
  );
}
