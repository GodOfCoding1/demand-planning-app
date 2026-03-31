"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { fetchItems } from "@/lib/api-client";
import type { ItemSummary } from "@/lib/types";
import { formatSkuName } from "@/lib/format";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback((term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!term.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const items = await fetchItems(term);
        setResults(items.slice(0, 12));
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      }
    }, 250);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    search(value);
  }

  function navigate(itemId: string) {
    setOpen(false);
    setQuery("");
    router.push(`/sku/${encodeURIComponent(itemId)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigate(results[activeIndex].item_id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Input
        placeholder="Search SKU..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="h-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-white text-slate-900 shadow-lg max-h-64 overflow-auto">
          {results.map((item, i) => (
            <li
              key={item.item_id}
              onMouseDown={() => navigate(item.item_id)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === activeIndex
                  ? "bg-slate-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="text-slate-900">{formatSkuName(item.item_id)}</span>
              {item.has_forecast && (
                <span className="ml-2 text-xs text-slate-500">
                  has forecast
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
