import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Recorta un valor numérico a 2 decimales (o a entero si el campo es de paso "1").
 * Solo actúa sobre números con formato válido; deja pasar vacíos o estados intermedios.
 */
function clampNumericInput(value: string, integerOnly: boolean): string {
  if (value === "") return value;
  const match = value.match(/^(-?\d*)(?:\.(\d*))?$/);
  if (!match) return value;

  const [, intPart = "", decPart = ""] = match;

  if (integerOnly) {
    return intPart;
  }

  if (decPart.length > 2) {
    return `${intPart}.${decPart.slice(0, 2)}`;
  }

  return value;
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, step, onChange, ...props }, ref) => {
    const isNumber = type === "number";
    const integerOnly = isNumber && (step === "1" || step === 1);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumber && onChange) {
        const clamped = clampNumericInput(event.target.value, integerOnly);
        if (clamped !== event.target.value) {
          event.target.value = clamped;
        }
      }
      onChange?.(event);
    };

    return (
      <input
        type={type}
        step={step ?? (isNumber ? "0.01" : undefined)}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
