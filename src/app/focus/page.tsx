"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useTasks,
  usePrefs,
  completeSession,
  createSession,
  regenerateSessions,
} from "@/client-lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeUrgency, formatDuration, generateSessions } from "@/shared/models/pulse";
import { cn } from "@/shared/utils";

export default function FocusPage() {
  const { data: tasks } = useTasks();
  const { data: prefs } = usePrefs();
  const mode = prefs?.mode ?? "student";
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workBlock, setWorkBlock] = useState(50);
  const [breakBlock, setBreakBlock] = useState(10);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const activeTasks = useMemo(() => (tasks ?? []).filter((t) => t.mode === mode && t.status !== "done"), [tasks, mode]);

  useEffect(() => {
    if (!selectedId && activeTasks.length) {
      const top = [...activeTasks].sort((a, b) => computeUrgency(b, now).score - computeUrgency(a, now).score)[0];
      if (top) setSelectedId(top.id);
    }
  }, [activeTasks, selectedId, now]);

  const selected = activeTasks.find((t) => t.id === selectedId) ?? null;

  const preview = useMemo(() => {
    if (!selected) return [];
    return generateSessions(selected, { workBlock, breakBlock, start: now });
  }, [selected, workBlock, breakBlock, now]);

  const generateSchedule = async () => {
    if (!selected) return;
    setScheduling(true);
    try {
      await regenerateSessions(selected.id, { workBlock, breakBlock });
      toast.success(`Planned ${preview.length} session${preview.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't generate schedule");
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="text-sm text-muted-foreground">Break big tasks into focused sprints</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Card className="p-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Task</label>
              <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Choose a task" /></SelectTrigger>
                <SelectContent>
                  {activeTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Work block</label>
                <Select value={String(workBlock)} onValueChange={(v) => setWorkBlock(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[25, 30, 45, 50, 60, 90].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Break</label>
                <Select value={String(breakBlock)} onValueChange={(v) => setBreakBlock(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selected && (
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <div className="font-medium text-foreground">{selected.title}</div>
                <div className="mt-1 text-muted-foreground">
                  Needs {formatDuration(Math.max(0, selected.estimatedMinutes - selected.completedMinutes))} • Due{" "}
                  {new Date(selected.deadline).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            )}

            <Button disabled={!selected || scheduling} onClick={generateSchedule}>
              {scheduling ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                "Generate Schedule"
              )}
            </Button>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Preview ({preview.length})</div>
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {preview.map((s, i) => (
                  <div key={i} className="flex justify-between rounded-md border px-2 py-1 text-xs">
                    <span>{s.startAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <span className="text-muted-foreground">{s.durationMinutes}m</span>
                  </div>
                ))}
                {preview.length === 0 && <div className="text-xs text-muted-foreground">No sessions needed.</div>}
              </div>
            </div>
          </div>
        </Card>

        <FocusTimer
          taskId={selected?.id ?? null}
          taskTitle={selected?.title ?? ""}
          defaultWork={workBlock}
          defaultBreak={breakBlock}
          sessionId={selected?.sessions.find((s) => !s.completed)?.id}
        />
      </div>
    </div>
  );
}

function FocusTimer({
  taskId,
  taskTitle,
  defaultWork,
  defaultBreak,
  sessionId,
}: {
  taskId: string | null;
  taskTitle: string;
  defaultWork: number;
  defaultBreak: number;
  sessionId: string | undefined;
}) {
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(defaultWork * 60);
  const [running, setRunning] = useState(false);
  const total = phase === "work" ? defaultWork * 60 : defaultBreak * 60;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Accumulates completed work SECONDS across phase transitions so finishing during a break
  // still credits the user for the prior work block(s).
  const completedWorkSecondsRef = useRef(0);
  // Timestamp marking when the currently running session started (used for startedAt on fallback).
  const startedAtRef = useRef<string | null>(null);

  // When the task or the work/break durations change, reset the timer and pause.
  // This ensures that tweaking the inputs while running doesn't leave stale state.
  useEffect(() => {
    setSecondsLeft(defaultWork * 60);
    setPhase("work");
    setRunning(false);
    completedWorkSecondsRef.current = 0;
    startedAtRef.current = null;
  }, [taskId, defaultWork, defaultBreak]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (phase === "work") {
            // Full work block finished — credit it in seconds.
            completedWorkSecondsRef.current += defaultWork * 60;
            toast.success("Work block done! Take a break.");
            setPhase("break");
            return defaultBreak * 60;
          } else {
            toast("Break over. Ready for another round?");
            setPhase("work");
            setRunning(false);
            return defaultWork * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, defaultWork, defaultBreak]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  const finish = async () => {
    if (!taskId) return;
    // Credit partial progress from the current work block (if we're mid-work).
    const partialWorkSeconds = phase === "work" ? Math.max(0, defaultWork * 60 - secondsLeft) : 0;
    const totalSeconds = completedWorkSecondsRef.current + partialWorkSeconds;
    const totalMinutes = Math.floor(totalSeconds / 60);

    if (totalMinutes <= 0) {
      toast("Nothing to log yet");
      setRunning(false);
      setSecondsLeft(defaultWork * 60);
      setPhase("work");
      completedWorkSecondsRef.current = 0;
      startedAtRef.current = null;
      return;
    }

    try {
      if (sessionId) {
        await completeSession(sessionId, taskId, totalMinutes);
      } else {
        // No pre-generated session — create an ad-hoc completed session so the work isn't lost.
        await createSession(taskId, {
          startedAt: startedAtRef.current ?? new Date().toISOString(),
          durationMinutes: totalMinutes,
          completed: true,
        });
      }
      toast.success(`Logged ${totalMinutes}m of focus time`);
    } catch {
      toast.error("Couldn't save session");
    } finally {
      setRunning(false);
      setSecondsLeft(defaultWork * 60);
      setPhase("work");
      completedWorkSecondsRef.current = 0;
      startedAtRef.current = null;
    }
  };

  return (
    <Card className="flex flex-col items-center justify-center gap-5 p-8">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {taskTitle || "No task selected"}
      </div>

      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 100 100"
          role="progressbar"
          aria-label="Session progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <circle cx="50" cy="50" r="46" className="fill-none stroke-muted" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="46"
            className={cn("fill-none transition-all", phase === "work" ? "stroke-red-500" : "stroke-emerald-500")}
            strokeWidth="4"
            strokeDasharray={`${Math.PI * 92}`}
            strokeDashoffset={`${Math.PI * 92 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <div className="font-mono text-5xl font-semibold tabular-nums tracking-tight">{mm}:{ss}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{phase === "work" ? "Focus" : "Break"}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setRunning((r) => !r)} disabled={!taskId}>
          {running ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setRunning(false);
            setSecondsLeft(defaultWork * 60);
            setPhase("work");
            completedWorkSecondsRef.current = 0;
            startedAtRef.current = null;
          }}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
        </Button>
        <Button variant="outline" onClick={finish} disabled={!taskId}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Log & end
        </Button>
      </div>
    </Card>
  );
}
