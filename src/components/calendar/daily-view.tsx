"use client";

import type { CalendarChildCtx } from "./calendar-shell";

// Placeholder. Full implementation lands in VYBE-102.
export function DailyView({ ctx }: { ctx: CalendarChildCtx }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
      Daily view ships with VYBE-102. {ctx.events.length} event(s) in range.
    </div>
  );
}
