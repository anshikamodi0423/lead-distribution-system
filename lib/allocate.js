/**
 * Lead Allocation Engine
 *
 * ALGORITHM:
 * 1. Look up mandatory providers for this service
 * 2. Filter out any mandatory providers who have hit their monthly quota
 * 3. Fill remaining slots (up to 3 total) using fair round-robin from the pool
 * 4. Round-robin counter is stored in DB and incremented atomically
 * 5. Entire operation runs inside a serializable transaction for concurrency safety
 *
 * CONCURRENCY HANDLING:
 * - Uses Prisma interactive transactions with isolation level SERIALIZABLE
 * - This means if two leads are created simultaneously, one will wait for
 *   the other to complete before proceeding
 * - The round-robin counter is read and incremented within the transaction,
 *   so no two concurrent leads can get the same counter value
 * - Provider currentCount is also updated within the transaction
 *
 * FAIR DISTRIBUTION:
 * - Round-robin counter per service is stored in the RoundRobinCounter table
 * - For each slot to fill, we take (counter % poolSize) to pick the next provider
 * - If that provider is at quota, skip to next in rotation
 * - Counter increments persist across server restarts (stored in DB)
 */

import { prisma } from "./db";

// SSE clients waiting for updates
let sseClients = [];

export function addSSEClient(client) {
  sseClients.push(client);
}

export function removeSSEClient(client) {
  sseClients = sseClients.filter((c) => c !== client);
}

export function notifySSEClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      // Client disconnected
    }
  });
}

export async function allocateLead(leadId, serviceId) {
  // Run allocation inside a serializable transaction for concurrency safety
  const assignments = await prisma.$transaction(
    async (tx) => {
      const TOTAL_SLOTS = 3;
      const assignedProviderIds = [];

      // Step 1: Get mandatory providers for this service
      const mandatoryRules = await tx.mandatoryRule.findMany({
        where: { serviceId },
        include: { provider: true },
      });

      // Step 2: Assign mandatory providers (if they have quota)
      for (const rule of mandatoryRules) {
        if (assignedProviderIds.length >= TOTAL_SLOTS) break;

        const provider = await tx.provider.findUnique({
          where: { id: rule.providerId },
        });

        if (provider && provider.currentCount < provider.monthlyQuota) {
          assignedProviderIds.push(provider.id);

          // Increment provider's current count
          await tx.provider.update({
            where: { id: provider.id },
            data: { currentCount: { increment: 1 } },
          });
        }
      }

      // Step 3: Fill remaining slots with fair round-robin
      const remainingSlots = TOTAL_SLOTS - assignedProviderIds.length;

      if (remainingSlots > 0) {
        // Get the fair pool for this service
        const fairPoolEntries = await tx.fairPool.findMany({
          where: { serviceId },
          include: { provider: true },
          orderBy: { providerId: "asc" }, // Consistent ordering
        });

        // Get and lock the round-robin counter
        const rrCounter = await tx.roundRobinCounter.findUnique({
          where: { serviceId },
        });

        let currentCounter = rrCounter ? rrCounter.counter : 0;
        const poolSize = fairPoolEntries.length;
        let filled = 0;
        let attempts = 0;

        // Try to fill remaining slots, cycling through the pool
        while (filled < remainingSlots && attempts < poolSize * 2) {
          const index = currentCounter % poolSize;
          const poolEntry = fairPoolEntries[index];
          currentCounter++;
          attempts++;

          // Skip if already assigned (mandatory) or at quota
          if (assignedProviderIds.includes(poolEntry.providerId)) continue;

          // Fetch fresh provider data within transaction
          const provider = await tx.provider.findUnique({
            where: { id: poolEntry.providerId },
          });

          if (provider && provider.currentCount < provider.monthlyQuota) {
            assignedProviderIds.push(provider.id);

            await tx.provider.update({
              where: { id: provider.id },
              data: { currentCount: { increment: 1 } },
            });

            filled++;
          }
        }

        // Persist the updated counter
        await tx.roundRobinCounter.update({
          where: { serviceId },
          data: { counter: currentCounter },
        });
      }

      // Step 4: Create lead assignments
      const createdAssignments = [];
      for (const providerId of assignedProviderIds) {
        const assignment = await tx.leadAssignment.create({
          data: { leadId, providerId },
          include: { provider: true, lead: { include: { service: true } } },
        });
        createdAssignments.push(assignment);
      }

      return createdAssignments;
    },
    {
      isolationLevel: "Serializable", // Prevents race conditions
      timeout: 15000, // 15 second timeout for the transaction
    }
  );

  // Notify SSE clients outside the transaction
  notifySSEClients({
    type: "new_assignments",
    assignments: assignments.map((a) => ({
      leadId: a.leadId,
      providerId: a.providerId,
      providerName: a.provider.name,
      leadName: a.lead.name,
      serviceName: a.lead.service.name,
      phone: a.lead.phone,
      city: a.lead.city,
      assignedAt: a.assignedAt,
    })),
  });

  return assignments;
}
