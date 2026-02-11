import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        s === "running" && "border-success text-success",
        s === "stopped" && "border-destructive text-destructive",
        (s === "paused" || s === "suspended") && "border-warning text-warning",
        !["running", "stopped", "paused", "suspended"].includes(s) && "border-muted-foreground text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  );
}
