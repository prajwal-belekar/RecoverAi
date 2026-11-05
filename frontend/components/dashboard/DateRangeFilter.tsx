"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select, SelectOption } from "@/components/ui/Select";
import { format } from "date-fns";

const PRESET_RANGES: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function DateRangeFilter({ onChange }: { onChange: (range: { from: Date | undefined; to: Date | undefined }) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("30");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  // Initialize preset on mount
  useEffect(() => {
    const preset = PRESET_RANGES.find((p) => p.days.toString() === selectedPreset);
    if (!preset) return;

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - preset.days);

    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomFrom(fromStr);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomTo(toStr);
    onChange({ from: new Date(fromStr), to: new Date(toStr) });
  }, [selectedPreset, onChange]);

  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = event.target.value;
    setSelectedPreset(preset);
    setIsOpen(false);

    if (preset === "custom") {
      return;
    }

    const days = parseInt(preset, 10);
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    setCustomFrom(fromStr);
    setCustomTo(toStr);
    onChange({ from: new Date(fromStr), to: new Date(toStr) });
  };

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    setIsOpen(false);
    onChange({ from: new Date(customFrom), to: new Date(customTo) });
  };

  const getDisplayText = () => {
    if (selectedPreset === "custom") {
      return `${format(new Date(customFrom), "MMM d")} - ${format(new Date(customTo), "MMM d, yyyy")}`;
    }
    const preset = PRESET_RANGES.find((p) => p.days.toString() === selectedPreset);
    return preset ? preset.label : "Last 30 days";
  };

  const presetOptions: SelectOption[] = [
    { value: "0", label: "Today" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "custom", label: "Custom range..." },
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between min-w-[200px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{getDisplayText()}</span>
        <svg
          className={cn("h-4 w-4 text-muted-foreground ml-2 flex-shrink-0", isOpen && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg bg-card border border-card-border shadow-lg overflow-hidden animate-in">
          <div className="p-2">
            <Select
              value={selectedPreset}
              onChange={handlePresetChange}
              options={presetOptions}
              className="w-full mb-3"
              placeholder="Select range"
            />
            <div className="space-y-2 border-t border-border pt-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="col-span-1 h-9 rounded-lg border border-border bg-input px-3 text-sm focus-ring"
                  max={format(new Date(), "yyyy-MM-dd")}
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="col-span-1 h-9 rounded-lg border border-border bg-input px-3 text-sm focus-ring"
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <Button className="w-full" size="sm" onClick={handleCustomApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed inset-0 z-40"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
}