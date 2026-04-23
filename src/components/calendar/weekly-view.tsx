"use client";

import type { CalendarChildCtx } from "./calendar-shell";

// Placeholder. Full implementation lands in VYBE-103.
export function WeeklyView({ ctx }: { ctx: CalendarChildCtx }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
      Weekly view ships with VYBE-103. {ctx.events.length} event(s) in range.
    </div>
  );
}
