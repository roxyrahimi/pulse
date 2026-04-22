import { NextResponse } from "next/server";
import { queryInternalDatabase } from "@/server-lib/internal-db-query";
import { validateSubtaskTitle } from "@/shared/models/pulse-validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { done, title } = (await req.json()) as { done?: boolean; title?: string };
  if (title !== undefined) {
    const validation = validateSubtaskTitle(title);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }
  if (done !== undefined) {
    await queryInternalDatabase(`UPDATE pulse_subtasks SET done = $1 WHERE id = $2`, [done, id]);
  }
  if (title !== undefined) {
    await queryInternalDatabase(`UPDATE pulse_subtasks SET title = $1 WHERE id = $2`, [title.trim(), id]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await queryInternalDatabase(`DELETE FROM pulse_subtasks WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
