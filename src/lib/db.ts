export type DbSource = "neon" | "pglite";
export const dbSource: DbSource = process.env.DATABASE_URL?.trim() ? "neon" : "pglite";

export async function ensureDbReady(): Promise<void> {
  return;
}

export async function getSql() {
  throw new Error("Database is not configured for this Martucci deploy.");
}
