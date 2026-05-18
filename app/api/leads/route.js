import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { allocateLead } from "@/lib/allocate";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, city, serviceId, description } = body;

    // Validate required fields
    if (!name || !phone || !city || !serviceId || !description) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create the lead — the unique constraint on (phone, serviceId)
    // will throw if duplicate exists
    let lead;
    try {
      lead = await prisma.lead.create({
        data: {
          name,
          phone: phone.trim(),
          city,
          serviceId: parseInt(serviceId),
          description,
        },
      });
    } catch (err) {
      // Prisma P2002 = unique constraint violation
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "A lead with this phone number already exists for this service" },
          { status: 409 }
        );
      }
      throw err;
    }

    // Trigger allocation
    const assignments = await allocateLead(lead.id, lead.serviceId);

    return NextResponse.json(
      {
        success: true,
        lead: { id: lead.id, name: lead.name },
        assignedTo: assignments.map((a) => a.provider.name),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Lead creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: fetch all leads
export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      service: true,
      assignments: { include: { provider: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}
