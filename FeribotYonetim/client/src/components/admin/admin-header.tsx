import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function AdminHeader({
  title,
  description,
  action,
  className,
}: AdminHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div className="mt-4 md:mt-0 flex items-center">{action}</div>}
    </div>
  );
}