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

  const response = await fetch(file.blob_url);
  if (!response.ok) {
    return new NextResponse("Failed to fetch file", { status: 502 });
  }

  const headers = new Headers(response.headers);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.file_name)}"`
  );
  headers.set("Content-Type", file.content_type || "application/octet-stream");
  headers.set("Content-Length", file.size.toString());

  return new NextResponse(response.body, {
    status: 200,
    headers,
  });
}
