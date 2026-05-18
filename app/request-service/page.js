"use client";

import { useState } from "react";

export default function RequestService() {
  const [form, setForm] = useState({ name: "", phone: "", city: "", serviceId: "", description: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error });
      } else {
        setStatus({ type: "success", message: `Lead created successfully! Assigned to: ${data.assignedTo.join(", ")}` });
        setForm({ name: "", phone: "", city: "", serviceId: "", description: "" });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Request a Service</h1>
        <p>Submit a service enquiry. Your lead will be automatically assigned to 3 providers.</p>
      </div>

      {status && (
        <div className={`alert alert-${status.type}`} style={{ maxWidth: 960 }}>
          {status.type === "success" ? "✓" : "✕"} {status.message}
        </div>
      )}

      <div className="form-wrapper">
        <div className="form-card">
          <h2>Lead Details</h2>
          <p className="form-subtitle">All fields are required</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full Name</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="John Doe" required />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="9999999999" required />
            </div>
            <div className="field">
              <label>City</label>
              <input name="city" type="text" value={form.city} onChange={handleChange} placeholder="Delhi" required />
            </div>
            <div className="field">
              <label>Service Type</label>
              <select name="serviceId" value={form.serviceId} onChange={handleChange} required>
                <option value="">Select a service</option>
                <option value="1">Service 1</option>
                <option value="2">Service 2</option>
                <option value="3">Service 3</option>
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe your requirement..." required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Lead →"}
            </button>
          </form>
        </div>

        <div className="form-info">
          <h3>📋 Assignment Rules</h3>
          <div className="info-block">
            <h4>Mandatory Providers</h4>
            <div className="rule-row">Service 1 <span className="rule-arrow">→</span> Provider 1 (always)</div>
            <div className="rule-row">Service 2 <span className="rule-arrow">→</span> Provider 5 (always)</div>
            <div className="rule-row">Service 3 <span className="rule-arrow">→</span> Provider 1 & 4 (always)</div>
          </div>
          <div className="info-block">
            <h4>Fair Rotation Pools</h4>
            <div className="rule-row">Service 1 <span className="rule-arrow">→</span> Providers 2, 3, 4</div>
            <div className="rule-row">Service 2 <span className="rule-arrow">→</span> Providers 6, 7, 8</div>
            <div className="rule-row">Service 3 <span className="rule-arrow">→</span> Providers 2, 3, 5, 6, 7, 8</div>
          </div>
          <div className="info-block">
            <h4>Rules</h4>
            <div className="rule-row">• Each lead → exactly 3 providers</div>
            <div className="rule-row">• Monthly quota → 10 leads per provider</div>
            <div className="rule-row">• Same phone + same service → rejected</div>
            <div className="rule-row">• Round-robin rotation → persists in DB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
