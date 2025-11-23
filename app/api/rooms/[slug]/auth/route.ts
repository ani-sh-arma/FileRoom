import { NextResponse } from "next/server";
import { getRoomBySlug } from "@/lib/db";
import { getAuthCookieName, signRoomToken, hashPassword } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  params = await params;
  const slug = decodeURIComponent(params.slug);
  const body = await req.json().catch(() => ({}));
  const password: string = body.password || "";

  const room = await getRoomBySlug(slug);
  if (!room) return new NextResponse("Not found", { status: 404 });

  if (!room.is_private) {
    const token = await signRoomToken({
      slug,
      password_hash: room.password_hash,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(getAuthCookieName(slug), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  if (!room.password_hash)
    return new NextResponse("Room misconfigured", { status: 500 });

  const computed = await hashPassword(password);
  if (computed !== room.password_hash)
    return new NextResponse("Invalid password", { status: 401 });

  const token = await signRoomToken({
    slug,
    password_hash: room.password_hash,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getAuthCookieName(slug), token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
