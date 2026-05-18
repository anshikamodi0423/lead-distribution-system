import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const providers = await prisma.provider.findMany({
    include: {
      leadAssignments: {
        include: {
          lead: {
            include: { service: true },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
    orderBy: { id: "asc" },
  });

  const result = providers.map((p) => ({
    id: p.id,
    name: p.name,
    monthlyQuota: p.monthlyQuota,
    currentCount: p.currentCount,
    remainingQuota: p.monthlyQuota - p.currentCount,
    leads: p.leadAssignments.map((a) => ({
      id: a.lead.id,
      name: a.lead.name,
      phone: a.lead.phone,
      city: a.lead.city,
      service: a.lead.service.name,
      description: a.lead.description,
      assignedAt: a.assignedAt,
    })),
  }));

  return NextResponse.json(result);
}
