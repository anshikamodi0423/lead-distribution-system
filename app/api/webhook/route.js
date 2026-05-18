/**
 * Webhook endpoint — simulates payment gateway callback
 *
 * IDEMPOTENCY:
 * Each webhook call must include an idempotency_key.
 * If the same key is sent twice, the second call is ignored.
 * This prevents double-processing (e.g., payment gateway sending duplicate callbacks).
 *
 * The idempotency key is stored in the WebhookLog table.
 * Before processing, we check if the key already exists.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifySSEClients } from "@/lib/allocate";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, idempotency_key } = body;

    if (!idempotency_key) {
      return NextResponse.json(
        { error: "idempotency_key is required" },
        { status: 400 }
      );
    }

    // Check idempotency — has this key been processed before?
    const existing = await prisma.webhookLog.findUnique({
      where: { idempotencyKey: idempotency_key },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Already processed (idempotent)",
        processedAt: existing.processedAt,
      });
    }

    // Process the webhook based on action
    if (action === "reset_quota") {
      // Reset all providers' current count to 0
      await prisma.provider.updateMany({
        data: { currentCount: 0 },
      });

      // Log the webhook as processed
      await prisma.webhookLog.create({
        data: {
          idempotencyKey: idempotency_key,
          action: "reset_quota",
        },
      });

      // Notify dashboards
      notifySSEClients({ type: "quota_reset" });

      return NextResponse.json({
        success: true,
        message: "Quota reset successfully",
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
