"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flag, Timer, ArrowRight } from "lucide-react";
import { useTasks, usePrefs } from "@/client-lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskDialog } from "@/components/pulse/task-dialog";
import {
  computeUrgency,
  formatDuration,
  urgencyBar,
  type Task,
  type FocusSession,
} from "@/shared/models/pulse";
import { cn } from "@/shared/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type DayEvent =
  | { kind: "deadline"; task: Task; at: Date }
  | { kind: "session"; task: Task; session: FocusSession; at: Date };

export default function CalendarPage() {
  const { data: tasks } = useTasks();
  const { data: prefs } = usePrefs();
  const mode = prefs?.mode ?? "student";

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());
  const today = new Date();

  // Only active tasks in current mode (exclude completed)
  const filtered = useMemo(
    () => (tasks ?? []).filter((t) => t.mode === mode && t.status !== "done"),
    [tasks, mode],
  );

  // Group events by day key
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const t of filtered) {
      const d = new Date(t.deadline);
      const key = ymd(d);
      const arr = map.get(key) ?? [];
      arr.push({ kind: "deadline", task: t, at: d });
      map.set(key, arr);
      for (const s of t.sessions) {
        const sd = new Date(s.startAt);
        const sk = ymd(sd);
        const sarr = map.get(sk) ?? [];
        sarr.push({ kind: "session", task: t, session: s, at: sd });
        map.set(sk, sarr);
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => a.at.getTime() - b.at.getTime());
    return map;
  }, [filtered]);

  // Build 6-row grid for the visible month
  const gridDays = useMemo(() => {
    const first = startOfMonth(cursor);
    const startOffset = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString([], { month: "long", year: "numeric" });

  const selectedEvents = eventsByDay.get(ymd(selected)) ?? [];

  // Count deadlines visible in current month view
  const deadlinesInView = useMemo(() => {
    return filtered.filter((t) => {
      const d = new Date(t.deadline);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    }).length;
  }, [filtered, cursor]);

  // Upcoming deadlines (sorted) regardless of month, max 5
  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...filtered]
      .filter((t) => new Date(t.deadline).getTime() >= now - 86400000) // include today even if past
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [filtered]);

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    const n = new Date();
    setCursor(startOfMonth(n));
    setSelected(n);
  };
  const jumpToNextDeadline = () => {
    const next = upcoming[0];
    if (!next) return;
    const d = new Date(next.deadline);
    setCursor(startOfMonth(d));
    setSelected(d);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Deadlines and focus sessions at a glance</p>
        </div>
        <TaskDialog mode={mode} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Month grid */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday} className="ml-1">Today</Button>
            </div>
            <div className="text-sm font-medium flex items-center gap-2">
              {monthLabel}
              {deadlinesInView > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {deadlinesInView} deadline{deadlinesInView === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Flag className="h-3 w-3" /> Deadline</span>
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> Focus</span>
            </div>
          </div>

          {/* Empty-month hint */}
          {deadlinesInView === 0 && filtered.length > 0 && upcoming[0] && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                No deadlines in {monthLabel}. Your next one is{" "}
                <span className="font-medium text-foreground">{upcoming[0].title}</span> on{" "}
                {new Date(upcoming[0].deadline).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}.
              </span>
              <Button size="sm" variant="outline" onClick={jumpToNextDeadline} className="h-7 text-xs">
                Jump <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
          {filtered.length === 0 && (
            <div className="mb-3 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              No active tasks in {mode === "student" ? "Student" : "Work"} mode. Create one to see it here.
            </div>
          )}

          <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-xs overflow-hidden">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-muted/40 px-2 py-1.5 text-center font-medium text-muted-foreground">{w}</div>
            ))}
            {gridDays.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selected);
              const evs = eventsByDay.get(ymd(d)) ?? [];
              const deadlines = evs.filter((e) => e.kind === "deadline");
              const sessions = evs.filter((e) => e.kind === "session");
              const hasDeadlines = deadlines.length > 0;

              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  onClick={() => setSelected(new Date(d))}
                  className={cn(
                    "group flex min-h-[104px] flex-col gap-1 bg-background p-1.5 text-left transition-colors hover:bg-accent/40",
                    !inMonth && "bg-muted/20 text-muted-foreground/60",
                    isSelected && "ring-2 ring-primary ring-inset",
                    hasDeadlines && !isSelected && "bg-primary/[0.03]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday && "bg-primary text-primary-foreground font-semibold",
                        hasDeadlines && !isToday && "font-bold text-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {sessions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Timer className="h-2.5 w-2.5" />{sessions.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-[3px] overflow-hidden">
                    {deadlines.slice(0, 3).map((e, i) => {
                      if (e.kind !== "deadline") return null;
                      const u = computeUrgency(e.task);
                      const pill =
                        u.level === "overdue" ? "bg-red-600 text-white border-red-800" :
                        u.level === "now" ? "bg-red-500 text-white border-red-700" :
                        u.level === "soon" ? "bg-orange-500 text-white border-orange-700" :
                        u.level === "early" ? "bg-amber-400 text-black border-amber-600" :
                        "bg-emerald-500 text-white border-emerald-700";
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-1 truncate rounded px-1.5 py-[2px] text-[11px] font-bold leading-tight shadow-sm border-l-2",
                            pill,
                          )}
                          title={e.task.title}
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/90 dark:bg-white/80 ring-1 ring-black/20" />
                          <span className="truncate">{e.task.title}</span>
                        </div>
                      );
                    })}
                    {deadlines.length > 3 && (
                      <div className="text-[10px] font-medium text-foreground/70">+{deadlines.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Upcoming deadlines list — always visible so tasks are discoverable */}
          {upcoming.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming deadlines</div>
                <span className="text-[10px] text-muted-foreground">Click to jump</span>
              </div>
              <ul className="space-y-1">
                {upcoming.map((t) => {
                  const u = computeUrgency(t);
                  const d = new Date(t.deadline);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCursor(startOfMonth(d));
                          setSelected(d);
                        }}
                        className="flex w-full items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left hover:bg-accent/40 transition-colors"
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", urgencyBar(u.level))} />
                        <span className="flex-1 truncate text-sm font-medium">{t.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {d.toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>

        {/* Side panel: selected day */}
        <Card className="p-4 h-fit lg:sticky lg:top-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">
                {selected.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedEvents.length === 0 ? "Nothing scheduled" : `${selectedEvents.length} item${selectedEvents.length === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              No deadlines or focus sessions on this day.
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e, i) => {
                if (e.kind === "deadline") {
                  const u = computeUrgency(e.task);
                  return (
                    <li key={i} className="rounded-md border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">{e.task.title}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Due {e.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            {" • "}{formatDuration(Math.max(0, e.task.estimatedMinutes - e.task.completedMinutes))} left
                          </div>
                        </div>
                        <Badge className={cn(
                          "shrink-0 text-[10px] font-semibold",
                          urgencyBar(u.level),
                          u.level === "early" ? "text-black" : "text-white",
                        )}>
                          {e.task.priority}
                        </Badge>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={i} className="rounded-md border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Timer className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{e.task.title}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {e.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          {" • "}{e.session.durationMinutes}m focus
                          {e.session.completed && " ✓"}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <TaskDialog
              mode={mode}
              trigger={
                <Button variant="secondary" size="sm" className="w-full">
                  <Flag className="mr-1.5 h-3.5 w-3.5" /> Add task
                </Button>
              }
            />
            <Link href="/focus">
              <Button variant="outline" size="sm" className="w-full">
                <Timer className="mr-1.5 h-3.5 w-3.5" /> Plan focus sessions
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
