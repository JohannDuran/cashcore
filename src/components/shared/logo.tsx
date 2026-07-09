"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-10 h-10",
  xl: "w-14 h-14",
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Circular badge logo — "FF" monogram */}
      <div className={cn("relative shrink-0", sizeMap[size])}>
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-label="CashCore logo">
          <defs>
            <linearGradient id="ff-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8BC5A3" />
              <stop offset="100%" stopColor="#6FA8C9" />
            </linearGradient>
            <linearGradient id="ff-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6aab8e" />
              <stop offset="50%" stopColor="#7AB8A0" />
              <stop offset="100%" stopColor="#6FA8C9" />
            </linearGradient>
          </defs>
          {/* Outer ring */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ff-ring)" strokeWidth="4" />
          {/* "FF" monogram */}
          <text
            x="50"
            y="58"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="url(#ff-fill)"
            fontSize="36"
            fontWeight="800"
            fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
            letterSpacing="-1"
          >
            FF
          </text>
          {/* Upward trend accent line */}
          <path
            d="M60 32 L68 24 L72 28"
            stroke="url(#ff-fill)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span
          className={cn(
            "font-bold font-display tracking-tight bg-gradient-to-r from-[#6aab8e] via-[#7ab8a0] to-[#6fa8c9] bg-clip-text text-transparent",
            size === "sm" && "text-sm",
            size === "md" && "text-xl",
            size === "lg" && "text-2xl",
            size === "xl" && "text-3xl"
          )}
        >
          CashCore
        </span>
      )}
    </div>
  );
}
