import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "primary"|"dark"|"outline"|"ghost" };
export function Button({ children, variant="primary", className, ...props }: Props) {
 const styles={primary:"bg-cobalt text-primary-foreground hover:bg-cobalt-deep",dark:"bg-ink text-primary-foreground hover:bg-ink-soft",outline:"border border-line bg-surface-glass hover:bg-surface",ghost:"text-muted-foreground hover:bg-surface-glass"};
 return <button className={cn("inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",styles[variant],className)} {...props}>{children}</button>;
}
