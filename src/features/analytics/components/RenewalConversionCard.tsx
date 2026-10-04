'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RenewalConversionData, RenewalConversionPoint } from '../hooks/useRetentionTabData';

export interface RenewalConversionCardProps {
  data: RenewalConversionData;
}

export function RenewalConversionCard({ data }: RenewalConversionCardProps) {
  const [periodMode, setPeriodMode] = useState<'month' | 'quarter'>('month');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const rawItems = periodMode === 'month' ? data.monthly : data.quarterly;
  const items: RenewalConversionPoint[] = rawItems.slice(-6);

  // Chart dimensions inside SVG viewBox="0 0 320 66"
  // Y range: 0% to 100%
  const plotTop = 6;
  const plotBottom = 46;
  const plotHeight = plotBottom - plotTop; // 40px

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return plotBottom - (clamped / 100) * plotHeight;
  };

  const yTicks = [
    { label: '100%', val: 100 },
    { label: '50%', val: 50 },
    { label: '0%', val: 0 },
  ];

  // X range: x from 24 to 314
  const plotLeft = 24;
  const plotRight = 314;
  const plotWidth = plotRight - plotLeft; // 290px

  const count = items.length;
  const slotWidth = plotWidth / count;

  const points = items.map((item, i) => {
    const cx = plotLeft + i * slotWidth + slotWidth / 2;
    const cy = getY(item.rate);
    return { cx, cy, item };
  });

  // SVG Line path string
  const linePathD = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`;
  }, '');

  // SVG Gradient Area path string
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPathD = firstPoint && lastPoint
    ? `${linePathD} L ${lastPoint.cx.toFixed(1)} ${plotBottom} L ${firstPoint.cx.toFixed(1)} ${plotBottom} Z`
    : '';

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between h-[153px] min-w-0 w-full overflow-hidden">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100 gap-1.5 min-w-0">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
            Конверсия продлений
          </h3>
          <span
            className="text-slate-400 text-[10px] cursor-help font-normal shrink-0"
            title="Доля учеников, продливших абонемент по истечении предыдущего"
          >
            ⓘ
          </span>
        </div>

        {/* Period Selector */}
        <div className="relative shrink-0">
          <select
            value={periodMode}
            onChange={(e) => {
              setPeriodMode(e.target.value as 'month' | 'quarter');
              setHoveredIndex(null);
            }}
            aria-label="Период конверсии"
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-1.5 pr-4 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-5 leading-none"
          >
            <option value="month">По месяцам</option>
            <option value="quarter">По кварталам</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400" />
        </div>
      </div>

      {/* 2. Big KPI Metric & Delta */}
      <div className="flex items-baseline justify-between pt-0.5 min-w-0">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none shrink-0">
            {data.currentRate}%
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 leading-none shrink-0 whitespace-nowrap">
            ↑ {data.change}
          </span>
        </div>
        <span className="text-[9.5px] text-slate-400 font-normal shrink-0 truncate ml-1">
          Было: {data.previousRate}%
        </span>
      </div>

      {/* 3. Vector Sparkline Chart */}
      <div className="relative flex-1 w-full min-h-0 pt-0.5 overflow-hidden">
        <svg
          viewBox="0 0 320 66"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="renewalAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((tick) => {
            const y = getY(tick.val);
            return (
              <g key={tick.val}>
                <text
                  x="20"
                  y={y + 3}
                  textAnchor="end"
                  className="text-[7.5px] fill-slate-400 font-medium"
                >
                  {tick.label}
                </text>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke={tick.val === 0 ? '#cbd5e1' : '#f1f5f9'}
                  strokeDasharray={tick.val === 0 ? undefined : '2 2'}
                  strokeWidth={tick.val === 0 ? '1' : '0.8'}
                />
              </g>
            );
          })}

          {/* Hover Guide Line */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].cx}
              y1={plotTop}
              x2={points[hoveredIndex].cx}
              y2={plotBottom}
              stroke="#cbd5e1"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {/* Area Fill */}
          {areaPathD && (
            <path
              d={areaPathD}
              fill="url(#renewalAreaGrad)"
              className="pointer-events-none"
            />
          )}

          {/* Smooth / Segmented Green Line */}
          <path
            d={linePathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />

          {/* Dots and X-axis Labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.cx}
                cy={p.cy}
                r={hoveredIndex === i ? 3.5 : 2.5}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.25"
                className="pointer-events-none transition-all duration-150"
              />

              <text
                x={p.cx}
                y="58"
                textAnchor="middle"
                className={`text-[8.5px] font-medium ${
                  hoveredIndex === i ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                }`}
              >
                {p.item.label}
              </text>

              {/* Invisible interactive column trigger */}
              <rect
                x={plotLeft + i * slotWidth}
                y={plotTop}
                width={slotWidth}
                height={plotHeight + 16}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none -top-1 transform -translate-x-1/2 bg-slate-900/90 text-white rounded-md px-2 py-0.5 text-[9px] shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${Math.max(20, Math.min(80, (points[hoveredIndex].cx / 320) * 100))}%`,
            }}
          >
            <span className="font-semibold text-slate-200">
              {points[hoveredIndex].item.label}:
            </span>{' '}
            <span className="font-bold text-emerald-400">
              {points[hoveredIndex].item.rate}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
