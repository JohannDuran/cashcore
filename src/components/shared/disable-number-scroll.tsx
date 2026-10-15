"use client";

import { useEffect } from "react";

/**
 * Disables scroll wheel changing values on number inputs globally.
 * This prevents accidental value changes when scrolling over focused number inputs.
 */
export function DisableNumberScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement &&
        target.type === "number" &&
        document.activeElement === target
      ) {
        // Blur to prevent scroll from changing value
        target.blur();
      }
    };

    // Use passive: false to allow preventDefault if needed
    document.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
