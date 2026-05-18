import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifySSEClients } from "@/lib/allocate";

export async function POST() {
  try {
    // Clear all leads, assignments, webhook logs
    await prisma.leadAssignment.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.webhookLog.deleteMany();

    // Reset provider counts
    await prisma.provider.updateMany({
      data: { currentCount: 0 },
    });

    // Reset round-robin counters
    await prisma.roundRobinCounter.updateMany({
      data: { counter: 0 },
    });

    notifySSEClients({ type: "full_reset" });

    return NextResponse.json({ success: true, message: "All data reset" });
  } catch (err) {
    console.error("Reset error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
