import React from 'react';
import { formatUsd } from '../utils/formatters.ts';

interface RiskLadderSvgProps {
  levels?: {
    current?: number | null;
    entryLow?: number | null;
    entryHigh?: number | null;
    stopLoss?: number | null;
    tp1?: number | null;
    tp2?: number | null;
    tp3?: number | null;
    invalidation?: number | null;
  };
}

export const RiskLadderSvg: React.FC<RiskLadderSvgProps> = ({ levels }) => {
  if (!levels) return null;

  const points: { label: string; value: number; color: string }[] = [];
  if (typeof levels.tp3 === 'number') points.push({ label: 'TP3', value: levels.tp3, color: '#10b981' });
  if (typeof levels.tp2 === 'number') points.push({ label: 'TP2', value: levels.tp2, color: '#34d399' });
  if (typeof levels.tp1 === 'number') points.push({ label: 'TP1', value: levels.tp1, color: '#6ee7b7' });
  if (typeof levels.current === 'number') points.push({ label: 'قیمت فعلی', value: levels.current, color: '#60a5fa' });
  if (typeof levels.entryHigh === 'number') points.push({ label: 'سقف ورود', value: levels.entryHigh, color: '#a78bfa' });
  if (typeof levels.entryLow === 'number') points.push({ label: 'کف ورود', value: levels.entryLow, color: '#8b5cf6' });
  if (typeof levels.stopLoss === 'number') points.push({ label: 'حد ضرر (SL)', value: levels.stopLoss, color: '#f43f5e' });
  if (typeof levels.invalidation === 'number' && levels.invalidation !== levels.stopLoss) {
    points.push({ label: 'سطح ابطال', value: levels.invalidation, color: '#fb923c' });
  }

  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => b.value - a.value);
  const maxVal = sorted[0].value;
  const minVal = sorted[sorted.length - 1].value;
  const range = maxVal - minVal || 1;

  const svgHeight = 250;
  const topPad = 24;
  const bottomPad = 24;
  const usableHeight = svgHeight - topPad - bottomPad;

  const toY = (val: number) => topPad + ((maxVal - val) / range) * usableHeight;

  return (
    <div className="bg-[#070b17] border border-slate-800/80 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-400 mb-3">
        نقشه بصری سطوح قیمتی و مدیریت ریسک
      </div>
      <svg
        viewBox={`0 0 460 ${svgHeight}`}
        className="w-full h-56 overflow-visible"
        role="img"
        aria-label="نمودار سطوح ورود، حد ضرر و اهداف قیمتی"
      >
        {/* Vertical Spine */}
        <line
          x1="230"
          y1={topPad}
          x2="230"
          y2={svgHeight - bottomPad}
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Entry Zone Band if both entryLow & entryHigh exist */}
        {typeof levels.entryLow === 'number' && typeof levels.entryHigh === 'number' && (
          <rect
            x="90"
            y={Math.min(toY(levels.entryHigh), toY(levels.entryLow))}
            width="280"
            height={Math.max(6, Math.abs(toY(levels.entryLow) - toY(levels.entryHigh)))}
            fill="rgba(139, 92, 246, 0.14)"
            stroke="rgba(139, 92, 246, 0.4)"
            strokeDasharray="3 3"
            rx="3"
          />
        )}

        {sorted.map((pt, idx) => {
          const y = toY(pt.value);
          // Alternate label sides cleanly to avoid crowding
          const onLeft = idx % 2 === 0;
          return (
            <g key={`${pt.label}-${idx}`}>
              <line
                x1={onLeft ? 135 : 230}
                y1={y}
                x2={onLeft ? 230 : 325}
                y2={y}
                stroke={pt.color}
                strokeWidth="1.5"
                strokeDasharray={pt.label === 'قیمت فعلی' ? undefined : '4 2'}
              />
              <circle cx="230" cy={y} r="4.5" fill={pt.color} stroke="#070b17" strokeWidth="1.5" />
              <text
                x={onLeft ? 128 : 332}
                y={y + 4}
                textAnchor={onLeft ? 'end' : 'start'}
                fill={pt.color}
                fontSize="11"
                fontFamily="Vazirmatn, sans-serif"
                fontWeight="600"
              >
                {pt.label}
              </text>
              <text
                x={onLeft ? 238 : 222}
                y={y + 4}
                textAnchor={onLeft ? 'start' : 'end'}
                fill="#e2e8f0"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatUsd(pt.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
