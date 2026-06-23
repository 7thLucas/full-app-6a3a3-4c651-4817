import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

/* ── Button ──────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "ghost" | "outline" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_6px_20px_-12px_var(--primary)]",
  ghost: "text-foreground/80 hover:text-foreground hover:bg-secondary",
  outline:
    "border border-border text-foreground hover:border-primary/60 hover:bg-secondary/60",
  subtle: "bg-secondary text-secondary-foreground hover:bg-muted",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-ui font-medium tracking-wide",
        "transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/* ── Live indicator ──────────────────────────────────────────────────── */

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-breathe" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
    </span>
  );
}

/* ── Eyebrow label ───────────────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-ui text-xs uppercase tracking-[0.32em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Section shell ───────────────────────────────────────────────────── */

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative mx-auto w-full px-6", className)}>
      {children}
    </section>
  );
}
