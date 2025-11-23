import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRoomBySlug, listFiles } from "@/lib/db";
import { getAuthCookieName, verifyRoomToken } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  params = await params;
  const slug = decodeURIComponent(params.slug);
  const room = await getRoomBySlug(slug);
  if (!room) return new NextResponse("Not found", { status: 404 });

  if (room.is_private) {
    const cookieStore = await cookies();
    const token = cookieStore.get(getAuthCookieName(slug))?.value;
    const ok = await verifyRoomToken({
      slug,
      password_hash: room.password_hash,
      token,
    });
    if (!ok) return new NextResponse("Unauthorized", { status: 401 });
  }

  const files = await listFiles(slug);
  return NextResponse.json({ files });
}
