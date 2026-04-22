import { NextResponse } from "next/server";
import { queryInternalDatabase } from "@/server-lib/internal-db-query";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { completed?: boolean; addCompletedMinutes?: number; taskId?: string };
  if (body.completed !== undefined) {
    await queryInternalDatabase(`UPDATE pulse_sessions SET completed = $1 WHERE id = $2`, [body.completed, id]);
  }
  if (body.addCompletedMinutes && body.taskId) {
    await queryInternalDatabase(
      `UPDATE pulse_tasks SET completed_minutes = LEAST(estimated_minutes, completed_minutes + $1), updated_at = NOW() WHERE id = $2`,
      [body.addCompletedMinutes, body.taskId],
    );
  }
  return NextResponse.json({ ok: true });
}
