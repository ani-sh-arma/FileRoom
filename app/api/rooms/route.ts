import { NextResponse } from "next/server"
import { createRoom } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const slug: string = (body.slug || "").toString().trim().toLowerCase()
    const is_private: boolean = !!body.is_private
    const password: string | undefined = body.password ? String(body.password) : undefined

    if (!slug || !/^[a-z0-9-]{1,64}$/.test(slug)) {
      return new NextResponse("Invalid slug. Use lowercase letters, numbers, and hyphens.", { status: 400 })
    }
    if (is_private && (!password || password.length < 4)) {
      return new NextResponse("Password must be at least 4 characters.", { status: 400 })
    }

    console.log("[v0] rooms: start create", { slug, is_private })
    const password_hash = is_private && password ? await hashPassword(password) : null
    console.log("[v0] rooms: hashed", { hasHash: !!password_hash })

    const room = await createRoom({ slug, is_private, password_hash })
    console.log("[v0] rooms: created", { id: room.id, slug: room.slug })
    return NextResponse.json({ room }, { status: 201 })
  } catch (e: any) {
    const msg = String(e?.message || e)
    console.log("[v0] rooms: create error", msg)
    if (msg.includes("DB_URL_MISSING")) {
      return new NextResponse(
        "Database is not configured. Please ensure a Postgres URL (DATABASE_URL or POSTGRES_URL) is set.",
        { status: 500 },
      )
    }
    if (msg.includes("SCHEMA_INIT_FAILED")) {
      return new NextResponse(`Database schema initialization failed: ${msg}`, { status: 500 })
    }
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return new NextResponse("Slug already exists. Choose another.", { status: 409 })
    }
    return new NextResponse(`Failed to create room: ${msg}`, { status: 500 })
  }
}
