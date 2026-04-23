"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CalendarEvent } from "@/shared/models/calendar";

export interface EventModalDefaults {
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  defaults?: EventModalDefaults;
}

// Placeholder. Full implementation lands in VYBE-106.
export function EventModal({ open, onOpenChange, event }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Event editor ships with VYBE-106.
        </p>
      </DialogContent>
    </Dialog>
  );
}
