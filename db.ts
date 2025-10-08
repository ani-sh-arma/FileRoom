import { neon } from "@neondatabase/serverless"

const CANDIDATE_ENV_VARS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NO_SSL",
] as const

function resolveDbUrl(): string | null {
  for (const key of CANDIDATE_ENV_VARS) {
    const val = process.env[key]
    if (val && String(val).trim().length > 0) return val as string
  }
  return null
}

let _sql: ReturnType<typeof neon> | null = null
export function getSql() {
  const url = resolveDbUrl()
  if (!url) {
    // Don't throw at module load time; throw here so callers can catch and return a helpful response
    throw new Error("DB_URL_MISSING")
  }
  if (!_sql) {
    _sql = neon(url)
  }
  return _sql
}

let schemaReady: Promise<void> | null = null
async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql()
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS rooms (
            id BIGSERIAL PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            is_private BOOLEAN NOT NULL DEFAULT FALSE,
            password_hash TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `
        await sql`
          CREATE TABLE IF NOT EXISTS files (
            id BIGSERIAL PRIMARY KEY,
            room_slug TEXT NOT NULL REFERENCES rooms(slug) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            blob_url TEXT NOT NULL,
            size BIGINT NOT NULL,
            content_type TEXT,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `
      } catch (e: any) {
        // Surface a stable error code we can catch in routes
        console.log("[v0] ensureSchema error:", e?.message || e)
        throw new Error(`SCHEMA_INIT_FAILED: ${e?.message || e}`)
      }
    })()
  }
  return schemaReady
}

export type Room = {
  id: number
  slug: string
  is_private: boolean
  password_hash: string | null
  created_at: string
}

export type FileRow = {
  id: number
  room_slug: string
  file_name: string
  blob_url: string
  size: number
  content_type: string | null
  uploaded_at: string
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql<Room[]>`SELECT * FROM rooms WHERE slug = ${slug} LIMIT 1`
  return rows[0] ?? null
}

export async function createRoom(params: {
  slug: string
  is_private: boolean
  password_hash: string | null
}): Promise<Room> {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql<Room[]>`
    INSERT INTO rooms (slug, is_private, password_hash)
    VALUES (${params.slug}, ${params.is_private}, ${params.password_hash})
    RETURNING *`
  return rows[0]
}

export async function listFiles(slug: string): Promise<FileRow[]> {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql<FileRow[]>`
    SELECT * FROM files WHERE room_slug = ${slug} ORDER BY uploaded_at DESC`
  return rows
}

export async function addFile(row: {
  room_slug: string
  file_name: string
  blob_url: string
  size: number
  content_type: string | null
}): Promise<FileRow> {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql<FileRow[]>`
    INSERT INTO files (room_slug, file_name, blob_url, size, content_type)
    VALUES (${row.room_slug}, ${row.file_name}, ${row.blob_url}, ${row.size}, ${row.content_type})
    RETURNING *`
  return rows[0]
}
