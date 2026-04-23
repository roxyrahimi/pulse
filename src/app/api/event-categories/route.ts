import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";
import { requireUserId } from "@/server-lib/auth";
import { queryInternalDatabase } from "@/server-lib/internal-db-query";
import {
  DEFAULT_CATEGORIES,
  validateCategoryInput,
  type EventCategory,
} from "@/shared/models/calendar";

export const runtime = "nodejs";

function rowToCategory(row: Record<string, unknown>): EventCategory {
  return {
    id: row.id as string,
    userEmail: row.user_email as string,
    name: row.name as string,
    color: row.color as string,
    isDefault: Boolean(row.is_default),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// Module-scoped pool for transactional seed-if-empty.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Race-safe auto-seed: if the user has zero categories, open a transaction,
 * take an advisory lock keyed by user_email, re-check inside the lock, and
 * insert the 4 defaults. Concurrent callers observe the inserts of whichever
 * request wins the lock and take the no-op path.
 */
async function ensureDefaultCategories(userId: string): Promise<void> {
  const existing = await queryInternalDatabase(
    `SELECT 1 FROM vybe_event_categories WHERE user_email = $1 LIMIT 1`,
    [userId],
  );
  if (existing.length > 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Advisory lock scoped to this user, released at COMMIT/ROLLBACK.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`vybe-cat-seed:${userId}`]);
    const { rows: recheck } = await client.query(
      `SELECT 1 FROM vybe_event_categories WHERE user_email = $1 LIMIT 1`,
      [userId],
    );
    if (recheck.length === 0) {
      for (const c of DEFAULT_CATEGORIES) {
        await client.query(
          `INSERT INTO vybe_event_categories (user_email, name, color, is_default)
           VALUES ($1, $2, $3, TRUE)`,
          [userId, c.name, c.color],
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function GET() {
  const gate = await requireUserId();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  await ensureDefaultCategories(userId);

  const rows = await queryInternalDatabase(
    `SELECT * FROM vybe_event_categories
     WHERE user_email = $1
     ORDER BY is_default DESC, created_at ASC`,
    [userId],
  );
  return NextResponse.json(rows.map(rowToCategory));
}

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const v = validateCategoryInput(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const rows = await queryInternalDatabase(
    `INSERT INTO vybe_event_categories (user_email, name, color, is_default)
     VALUES ($1, $2, $3, FALSE)
     RETURNING *`,
    [userId, v.value.name, v.value.color],
  );
  return NextResponse.json(rowToCategory(rows[0] as Record<string, unknown>));
}
