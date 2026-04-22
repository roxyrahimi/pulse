"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTasks, usePrefs } from "@/client-lib/api-client";
import { computeUrgency, formatRemaining } from "@/shared/models/pulse";

/**
 * Adaptive in-app notifier.
 * - "Overdue" when deadline has passed
 * - "Start Now" alerts when urgency crosses into now
 * - "Falling behind" when user is behind pace (ratio > 0.8 or not finite)
 * Re-evaluates every 30s and only fires once per state per task.
 * Gated by prefs.notificationsEnabled.
 */
export function PulseNotifier() {
  const { data: tasks } = useTasks();
  const { data: prefs } = usePrefs();
  const seen = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!tasks) return;
    const enabled = prefs?.notificationsEnabled ?? true;
    if (!enabled) return;

    const tick = () => {
      const now = new Date();
      for (const t of tasks) {
        if (t.status === "done") continue;
        const u = computeUrgency(t, now);
        let key: string | null = null;
        let title = "";
        let description = "";

        if (u.level === "overdue") {
          key = "overdue";
          title = `⚠️ Overdue: ${t.title}`;
          description = "This task is past its deadline.";
        } else if (u.level === "now") {
          key = "now";
          title = `🔥 Start now: ${t.title}`;
          description = `Only ${formatRemaining(u.minutesRemaining)} left — needs your full focus.`;
        } else if (u.behind && (!isFinite(u.ratio) || u.ratio > 0.8)) {
          key = "behind";
          title = `📉 You're falling behind: ${t.title}`;
          description = "Not enough time left for the remaining work.";
        }

        if (key && seen.current[t.id] !== key) {
          seen.current[t.id] = key;
          toast(title, { description, duration: 7000 });
        }
      }
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [tasks, prefs]);

  return null;
}
