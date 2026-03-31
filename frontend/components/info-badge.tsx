"use client";

import { useState } from "react";

interface InfoBadgeProps {
  label: string;
  value: string;
  tooltip: string;
}

export function InfoBadge({ label, value, tooltip }: InfoBadgeProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative rounded-lg border px-3 py-1.5 text-center cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums">{value}</p>

      {show && (
        <div className="fixed z-[9999] w-72 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg text-left leading-relaxed"
          style={{
            top: "var(--tooltip-top)",
            left: "var(--tooltip-left)",
          }}
          ref={(el) => {
            if (el) {
              const parent = el.parentElement;
              if (parent) {
                const rect = parent.getBoundingClientRect();
                el.style.top = `${rect.bottom + 8}px`;
                el.style.left = `${Math.max(8, rect.left + rect.width / 2 - 144)}px`;
              }
            }
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
