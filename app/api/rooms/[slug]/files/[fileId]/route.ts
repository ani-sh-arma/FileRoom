import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRoomBySlug, deleteFile } from "@/lib/db";
import { getAuthCookieName, verifyRoomToken } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; fileId: string } }
) {
  params = await params;
  const slug = decodeURIComponent(params.slug);
  const fileId = parseInt(params.fileId, 10);

  if (isNaN(fileId)) {
    return new NextResponse("Invalid file ID", { status: 400 });
  }

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

  await deleteFile(slug, fileId);
  return new NextResponse("OK");
}
