"use client";

import type { CalendarChildCtx } from "./calendar-shell";

// Placeholder. Full implementation lands in VYBE-104.
export function MonthlyView({ ctx }: { ctx: CalendarChildCtx }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
      Monthly view ships with VYBE-104. {ctx.events.length} event(s) in range.
    </div>
  );
}
