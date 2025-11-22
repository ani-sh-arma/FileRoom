import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addFile, getRoomBySlug } from "@/lib/db";
import { getAuthCookieName, verifyRoomToken } from "@/lib/auth";
import { put } from "@vercel/blob";

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("No file provided", { status: 400 });
  }

  const { url } = await put(`rooms/${slug}/${file.name}`, file as any, {
    access: "public",
    addRandomSuffix: true,
  });

  const saved = await addFile({
    room_slug: slug,
    file_name: file.name,
    blob_url: url,
    size: (file as any).size ?? 0,
    content_type: (file as any).type ?? null,
  });

  return NextResponse.json({ file: saved });
}
