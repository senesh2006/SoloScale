"use client";

import { cn } from "@/lib/utils";

type Props = {
  /** dark = dark mode UI; light = marketing landing with dark text */
  variant?: "dark" | "light";
  className?: string;
};

export function MovingGradientBackground({ variant = "dark", className }: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        variant === "dark" ? "bg-zinc-950" : "bg-white",
        className
      )}
    >
      {/* The Animated Gradient Layer */}
      <div 
        className={cn(
          "absolute inset-[-50%] opacity-40 animate-aurora",
          variant === "dark" 
            ? "bg-[conic-gradient(from_90deg_at_50%_50%,#1e1b4b,#4c1d95,#1e1b4b)]"
            : "bg-[conic-gradient(from_90deg_at_50%_50%,#e0e7ff,#f5f3ff,#e0e7ff)]"
        )}
        style={{
          filter: "blur(80px)",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Decorative Orbs */}
      <div 
        className={cn(
          "absolute left-[10%] top-[10%] h-[40%] w-[40%] rounded-full blur-[120px] animate-float-slow opacity-30",
          variant === "dark" ? "bg-violet-900" : "bg-violet-200"
        )}
      />
      <div 
        className={cn(
          "absolute right-[10%] bottom-[10%] h-[30%] w-[30%] rounded-full blur-[100px] animate-float-slow opacity-20",
          variant === "dark" ? "bg-indigo-900" : "bg-indigo-100"
        )}
        style={{ animationDelay: "-4s" }}
      />

      {/* Surface Overlays */}
      {variant === "light" ? (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
      ) : (
        <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[1px]" />
      )}

      {/* Texture */}
      <div 
        className={cn(
          "absolute inset-0 opacity-[0.03]",
          variant === "dark" ? "bg-dots-white" : "bg-dots"
        )}
        style={{
          backgroundImage: variant === "dark" 
            ? "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)" 
            : undefined
        }}
      />
    </div>
  );
}
