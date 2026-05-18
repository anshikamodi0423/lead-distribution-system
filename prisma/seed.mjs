import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.webhookLog.deleteMany();
  await prisma.leadAssignment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.roundRobinCounter.deleteMany();
  await prisma.fairPool.deleteMany();
  await prisma.mandatoryRule.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.service.deleteMany();

  // Create 3 services
  const service1 = await prisma.service.create({ data: { id: 1, name: "Service 1" } });
  const service2 = await prisma.service.create({ data: { id: 2, name: "Service 2" } });
  const service3 = await prisma.service.create({ data: { id: 3, name: "Service 3" } });
  console.log("Services created");

  // Create 8 providers (monthly quota: 10 each)
  for (let i = 1; i <= 8; i++) {
    await prisma.provider.create({
      data: { id: i, name: `Provider ${i}`, monthlyQuota: 10, currentCount: 0 },
    });
  }
  console.log("Providers created");

  // Mandatory assignment rules:
  // Service 1 → Provider 1 must always receive
  // Service 2 → Provider 5 must always receive
  // Service 3 → Provider 1 AND Provider 4 must always receive
  await prisma.mandatoryRule.createMany({
    data: [
      { serviceId: 1, providerId: 1 },
      { serviceId: 2, providerId: 5 },
      { serviceId: 3, providerId: 1 },
      { serviceId: 3, providerId: 4 },
    ],
  });
  console.log("Mandatory rules created");

  // Fair pool (providers eligible for remaining slots):
  // Service 1 → Providers 2, 3, 4
  // Service 2 → Providers 6, 7, 8
  // Service 3 → Providers 2, 3, 5, 6, 7, 8
  await prisma.fairPool.createMany({
    data: [
      { serviceId: 1, providerId: 2 },
      { serviceId: 1, providerId: 3 },
      { serviceId: 1, providerId: 4 },
      { serviceId: 2, providerId: 6 },
      { serviceId: 2, providerId: 7 },
      { serviceId: 2, providerId: 8 },
      { serviceId: 3, providerId: 2 },
      { serviceId: 3, providerId: 3 },
      { serviceId: 3, providerId: 5 },
      { serviceId: 3, providerId: 6 },
      { serviceId: 3, providerId: 7 },
      { serviceId: 3, providerId: 8 },
    ],
  });
  console.log("Fair pools created");

  // Round-robin counters (one per service, persisted in DB)
  await prisma.roundRobinCounter.createMany({
    data: [
      { serviceId: 1, counter: 0 },
      { serviceId: 2, counter: 0 },
      { serviceId: 3, counter: 0 },
    ],
  });
  console.log("Round-robin counters created");

  console.log("Seed complete!");
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
