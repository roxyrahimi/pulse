"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Placeholder. Full implementation lands in VYBE-105.
export function CategoryManager({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Category management ships with VYBE-105.
        </p>
      </DialogContent>
    </Dialog>
  );
}
