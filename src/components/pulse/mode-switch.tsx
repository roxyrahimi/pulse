"use client";

import { GraduationCap, Briefcase } from "lucide-react";
import { updatePrefs, usePrefs } from "@/client-lib/api-client";
import { cn } from "@/shared/utils";
import type { AppMode } from "@/shared/models/pulse";

export function ModeSwitch() {
  const { data } = usePrefs();
  const mode = data?.mode ?? "student";

  const set = (m: AppMode) => {
    if (m !== mode) void updatePrefs({ mode: m });
  };

  return (
    <div className="inline-flex rounded-full border bg-muted/40 p-1 text-xs">
      <button
        onClick={() => set("student")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all",
          mode === "student" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Student
      </button>
      <button
        onClick={() => set("work")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all",
          mode === "work" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Briefcase className="h-3.5 w-3.5" />
        Work
      </button>
    </div>
  );
}
