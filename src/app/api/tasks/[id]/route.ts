import { NextResponse } from "next/server";
import { queryInternalDatabase } from "@/server-lib/internal-db-query";
import { validateTaskPatch } from "@/shared/models/pulse-validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const validation = validateTaskPatch(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const fields: string[] = [];
  const values: (string | number | boolean | Date | null)[] = [];
  const map: Record<string, string> = {
    title: "title",
    category: "category",
    deadline: "deadline",
    estimatedMinutes: "estimated_minutes",
    priority: "priority",
    mode: "mode",
    status: "status",
    completedMinutes: "completed_minutes",
    notes: "notes",
  };
  for (const [k, v] of Object.entries(body)) {
    const col = map[k];
    if (!col) continue;
    const value = k === "title" && typeof v === "string" ? v.trim() : v;
    values.push(value as string | number | boolean | Date | null);
    fields.push(`${col} = $${values.length}`);
  }
  if (fields.length === 0) return NextResponse.json({ ok: true });
  values.push(id);
  await queryInternalDatabase(
    `UPDATE pulse_tasks SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`,
    values,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await queryInternalDatabase(`DELETE FROM pulse_tasks WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
