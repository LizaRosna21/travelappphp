import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm" | "lg" | "xl" | "full";
}

export function Container({
  className,
  size = "default",
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 md:px-6",
        {
          "max-w-screen-sm": size === "sm",
          "max-w-screen-md": size === "default",
          "max-w-screen-lg": size === "lg",
          "max-w-screen-xl": size === "xl",
          "max-w-none": size === "full",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}