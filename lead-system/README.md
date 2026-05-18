# Prowider — Mini Lead Distribution System

A lead generation and distribution system where customer enquiries are automatically assigned to providers based on mandatory rules and fair round-robin allocation.

## Live Demo

🔗 **[Live URL]** (add after deployment)

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Real-time:** Server-Sent Events (SSE)

## Setup Instructions

```bash
# 1. Clone the repo
git clone <repo-url>
cd lead-distribution-system

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Seed the database
node prisma/seed.mjs

# 6. Start the dev server
npm run dev
```

Open http://localhost:3000

## Pages

| Route | Purpose |
|-------|---------|
| `/request-service` | Public form — customer submits a service enquiry |
| `/dashboard` | Provider dashboard — real-time view of assigned leads |
| `/test-tools` | Testing panel — webhook, idempotency, concurrency tests |

---

## Allocation Algorithm

For every new lead, exactly **3 providers** are assigned:

**Step 1 — Mandatory Assignment:**
Each service has predefined mandatory providers:
- Service 1 → Provider 1
- Service 2 → Provider 5
- Service 3 → Provider 1 AND Provider 4

Mandatory providers are assigned first, as long as they haven't exceeded their monthly quota of 10.

**Step 2 — Fair Round-Robin for Remaining Slots:**
After mandatory providers, remaining slots (up to 3 total) are filled from a service-specific pool:
- Service 1 pool → Providers 2, 3, 4
- Service 2 pool → Providers 6, 7, 8
- Service 3 pool → Providers 2, 3, 5, 6, 7, 8

The pool is ordered by provider ID. A **round-robin counter** (stored in the `RoundRobinCounter` table) determines which provider is next. For each slot:
1. `index = counter % poolSize` → pick the provider at that index
2. If the provider is at quota or already assigned to this lead, skip and try next
3. Increment counter

The counter **persists in the database**, so rotation continues correctly even after server restarts. This is NOT random — it's deterministic and fair.

**Example:** Service 1 pool = [P2, P3, P4], counter = 0
- Lead 1: counter=0 → P2, counter=1 → P3 (2 slots filled)
- Lead 2: counter=2 → P4, counter=3 → P2 (wraps around)
- Lead 3: counter=4 → P3, counter=5 → P4

Every provider gets equal turns over time.

---

## Concurrency Handling

The entire allocation (read counter → assign providers → increment counter → update quotas) runs inside a **Prisma interactive transaction with `Serializable` isolation level**.

```javascript
await prisma.$transaction(async (tx) => {
  // All reads and writes happen atomically
  // If two transactions conflict, one retries
}, { isolationLevel: "Serializable" });
```

This means:
- If two leads are created at the exact same time, the database serializes them
- No two leads can read the same counter value
- No provider can exceed their quota due to race conditions
- No lead can be double-assigned to the same provider

This was tested using the "Generate 10 Leads Simultaneously" button in `/test-tools`.

---

## Webhook Idempotency

The webhook endpoint (`POST /api/webhook`) requires an `idempotency_key` parameter.

**How it works:**
1. Before processing, check if the key exists in the `WebhookLog` table
2. If it exists → return success but do NOT process again
3. If it doesn't exist → process the action AND insert the key into `WebhookLog`

```
First call:  key="abc" → process quota reset → save "abc" to WebhookLog
Second call: key="abc" → found in WebhookLog → skip processing → return "Already processed"
```

This prevents duplicate processing when a payment gateway sends the same callback multiple times (which is common in production).

**Tested via:** The "Send 5 Identical Webhooks" button in `/test-tools` sends the same key 5 times simultaneously. Only the first one processes.

---

## Duplicate Lead Prevention

Enforced at the **database level** using a unique constraint:

```prisma
@@unique([phone, serviceId])
```

- Same phone + same service = rejected (Prisma error P2002)
- Same phone + different service = allowed

This cannot be bypassed by frontend manipulation.

---

## Real-Time Dashboard

The dashboard connects to `/api/stream` via Server-Sent Events (SSE).

When a new lead is assigned:
1. The allocation engine calls `notifySSEClients()` with the assignment data
2. All connected dashboard clients receive the event
3. The dashboard re-fetches provider data to update the UI

No page refresh required. Test by opening `/dashboard` in one tab and submitting a lead in another.

---

## Database Schema

```
Service (id, name)
Provider (id, name, monthlyQuota, currentCount)
Lead (id, name, phone, city, serviceId, description) — unique(phone, serviceId)
LeadAssignment (id, leadId, providerId) — unique(leadId, providerId)
MandatoryRule (serviceId, providerId)
FairPool (serviceId, providerId)
RoundRobinCounter (serviceId, counter) — persists rotation state
WebhookLog (idempotencyKey, action, processedAt) — prevents duplicate webhook processing
```
