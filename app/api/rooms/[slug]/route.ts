import { NextResponse } from "next/server";
import { getRoomBySlug } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  params = await params;
  try {
    const slug = params.slug;
    if (!slug) {
      return new NextResponse("Slug is required", { status: 400 });
    }

    const room = await getRoomBySlug(slug);
    return NextResponse.json({ exists: !!room, room });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[v0] check room error:", msg);
    return new NextResponse(`Failed to check room: ${msg}`, { status: 500 });
  }
}
