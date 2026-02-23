'use client';

import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ContributionHeatmapProps {
  data: Map<string, number>;
}

function getLevel(seconds: number): number {
  if (seconds === 0) return 0;
  if (seconds <= 1800) return 1;
  if (seconds <= 3600) return 2;
  if (seconds <= 7200) return 3;
  return 4;
}

const LEVEL_COLORS = [
  'bg-muted',
  'bg-[rgba(50,255,50,0.15)]',
  'bg-[rgba(50,255,50,0.35)]',
  'bg-[rgba(50,255,50,0.55)]',
  'bg-[rgba(50,255,50,0.85)]',
];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(seconds: number): string {
  if (seconds === 0) return 'No activity';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const cells: Array<{ date: string; level: number; seconds: number; day: number }> = [];

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const seconds = data.get(dateStr) ?? 0;
      cells.push({
        date: dateStr,
        level: getLevel(seconds),
        seconds,
        day: d.getDay(),
      });
    }

    const offset = cells[0]?.day ?? 0;
    const padded = Array.from({ length: offset }, () => null);
    const allCells = [...padded, ...cells];

    const weeksList: Array<Array<(typeof allCells)[number]>> = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeksList.push(allCells.slice(i, i + 7));
    }

    const labels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    weeksList.forEach((week, wi) => {
      const firstReal = week.find((c) => c !== null);
      if (firstReal) {
        const month = new Date(firstReal.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ label: MONTHS[month], col: wi });
          lastMonth = month;
        }
      }
    });

    return { weeks: weeksList, monthLabels: labels };
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-0.5 min-w-fit">
        <div className="flex flex-col gap-0.5 mr-1 pt-4">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[11px] text-[9px] font-mono text-muted-foreground flex items-center"
            >
              {label}
            </div>
          ))}
        </div>

        <div>
          <div className="flex gap-0.5 mb-1 h-4 relative">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[9px] font-mono text-muted-foreground absolute"
                style={{ left: `${m.col * 13}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5 relative">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell, di) =>
                  cell === null ? (
                    <div key={di} className="w-[11px] h-[11px]" />
                  ) : (
                    <Tooltip key={di}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-[11px] h-[11px] ${LEVEL_COLORS[cell.level]} transition-colors`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-mono text-xs">
                        <span className="font-bold">{formatTime(cell.seconds)}</span>
                        <span className="text-muted-foreground ml-2">{cell.date}</span>
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3">
        <span className="text-[9px] font-mono text-muted-foreground mr-1">Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} className={`w-[11px] h-[11px] ${color}`} />
        ))}
        <span className="text-[9px] font-mono text-muted-foreground ml-1">More</span>
      </div>
    </div>
  );
}
