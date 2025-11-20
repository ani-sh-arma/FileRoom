import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { getRoomBySlug } from "@/lib/db"
import { getAuthCookieName, verifyRoomToken } from "@/lib/auth"
import RoomClient from "@/components/room-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function RoomPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug)
  const room = await getRoomBySlug(slug)
  if (!room) return notFound()

  let authed = false
  if (!room.is_private) {
    authed = true
  } else {
    const cookieStore = await cookies()
    const token = cookieStore.get(getAuthCookieName(slug))?.value
    authed = await verifyRoomToken({ slug, password_hash: room.password_hash, token })
  }

  return (
    <main className="min-h-dvh p-6">
      <div className="max-w-3xl mx-auto grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">/{room.slug}</CardTitle>
          </CardHeader>
          <CardContent>
            {room.is_private ? (
              <p className="text-muted-foreground">
                This page is private. {authed ? "You are authenticated." : "Password required."}
              </p>
            ) : (
              <p className="text-muted-foreground">
                This page is public. Anyone with the link can view and upload files.
              </p>
            )}
          </CardContent>
        </Card>

        <RoomClient slug={room.slug} isPrivate={room.is_private} authed={authed} />
      </div>
    </main>
  )
}
