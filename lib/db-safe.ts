import { neon } from "@neondatabase/serverless"

type Sql = ReturnType<typeof neon>

let _sql: Sql | null = null
let _schemaReady = false

function getDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL_NO_SSL,
  ].filter(Boolean) as string[]
  if (candidates.length === 0) {
    throw new Error(
      "DATABASE_URL not found. Ensure Neon is connected or set one of: DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, POSTGRES_URL_NO_SSL.",
    )
  }
  return candidates[0]
}

export function sql(): Sql {
  if (_sql) return _sql
  const url = getDatabaseUrl()
  _sql = neon(url)
  return _sql!
}

export async function ensureSchema() {
  if (_schemaReady) return
  const s = sql()
  // Rooms table
  await s`
    create table if not exists rooms (
      id bigserial primary key,
      slug text unique not null,
      is_private boolean not null default false,
      password_hash text,
      created_at timestamptz not null default now()
    );
  `
  // Files table
  await s`
    create table if not exists files (
      id bigserial primary key,
      room_id bigint not null references rooms(id) on delete cascade,
      blob_url text not null,
      filename text,
      content_type text,
      size bigint,
      created_at timestamptz not null default now()
    );
  `
  await s`create index if not exists files_room_idx on files(room_id);`
  _schemaReady = true
}

export async function findRoomBySlug(slug: string) {
  const s = sql()
  const rows = await s<{ id: number; slug: string; is_private: boolean; password_hash: string | null }>`
    select id, slug, is_private, password_hash from rooms where slug = ${slug} limit 1
  `
  return rows[0] || null
}
