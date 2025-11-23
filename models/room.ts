export interface Room {
  id: number;
  slug: string;
  is_private: boolean;
  password_hash: string | null;
}
