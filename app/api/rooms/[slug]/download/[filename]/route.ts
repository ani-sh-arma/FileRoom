import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRoomBySlug, getFile } from "@/lib/db";
import { getAuthCookieName, verifyRoomToken } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { slug: string; filename: string } }
) {
  params = await params;
  const slug = decodeURIComponent(params.slug);
  const filename = decodeURIComponent(params.filename);

  const room = await getRoomBySlug(slug);
  if (!room) return new NextResponse("Room not found", { status: 404 });

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

  const file = await getFile(slug, filename);
  if (!file) return new NextResponse("File not found", { status: 404 });

  return NextResponse.redirect(file.blob_url);
}
