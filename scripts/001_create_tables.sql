-- Rooms table: unique slug, optional password hash for private rooms
CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files table: metadata for files in rooms
CREATE TABLE IF NOT EXISTS files (
  id BIGSERIAL PRIMARY KEY,
  room_slug TEXT NOT NULL REFERENCES rooms(slug) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  size BIGINT NOT NULL,
  content_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
