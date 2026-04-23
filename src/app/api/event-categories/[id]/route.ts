import { NextResponse } from "next/server";
import { requireUserId } from "@/server-lib/auth";
import { queryInternalDatabase } from "@/server-lib/internal-db-query";
import { validateCategoryPatch } from "@/shared/models/calendar";

export const runtime = "nodejs";

async function loadOwned(id: string, userId: string) {
  const rows = await queryInternalDatabase(
    `SELECT * FROM vybe_event_categories WHERE id = $1 AND user_email = $2`,
    [id, userId],
  );
  return rows[0] as Record<string, unknown> | undefined;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireUserId();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  const { id } = await params;
  const existing = await loadOwned(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const v = validateCategoryPatch(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (v.value.name !== undefined) {
    values.push(v.value.name);
    fields.push(`name = $${values.length}`);
  }
  if (v.value.color !== undefined) {
    values.push(v.value.color);
    fields.push(`color = $${values.length}`);
  }
  if (fields.length === 0) return NextResponse.json({ ok: true });

  values.push(id);
  values.push(userId);
  await queryInternalDatabase(
    `UPDATE vybe_event_categories SET ${fields.join(", ")}
     WHERE id = $${values.length - 1} AND user_email = $${values.length}`,
    values,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireUserId();
  if (gate instanceof NextResponse) return gate;
  const userId = gate;

  const { id } = await params;
  const existing = await loadOwned(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.is_default === true) {
    return NextResponse.json(
      { error: "Default category cannot be deleted" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const reassignTo = url.searchParams.get("reassignTo");

  // Count events using this category.
  const countRows = await queryInternalDatabase(
    `SELECT COUNT(*)::int AS n FROM vybe_events WHERE user_email = $1 AND category_id = $2`,
    [userId, id],
  );
  const count = (countRows[0]?.n as number | undefined) ?? 0;

  if (count > 0) {
    if (!reassignTo) {
      return NextResponse.json(
        { error: `Category has ${count} event(s). Provide ?reassignTo=<categoryId> or an empty value to clear.` },
        { status: 409 },
      );
    }
    if (reassignTo === "") {
      await queryInternalDatabase(
        `UPDATE vybe_events SET category_id = NULL, updated_at = NOW()
         WHERE user_email = $1 AND category_id = $2`,
        [userId, id],
      );
    } else {
      const target = await loadOwned(reassignTo, userId);
      if (!target) return NextResponse.json({ error: "reassignTo category not found" }, { status: 400 });
      if ((target.id as string) === id) {
        return NextResponse.json({ error: "Cannot reassign to the category being deleted" }, { status: 400 });
      }
      await queryInternalDatabase(
        `UPDATE vybe_events SET category_id = $3, updated_at = NOW()
         WHERE user_email = $1 AND category_id = $2`,
        [userId, id, reassignTo],
      );
    }
  }

  await queryInternalDatabase(
    `DELETE FROM vybe_event_categories WHERE id = $1 AND user_email = $2`,
    [id, userId],
  );
  return NextResponse.json({ ok: true });
}
