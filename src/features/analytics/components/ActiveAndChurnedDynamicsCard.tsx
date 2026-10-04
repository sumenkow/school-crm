'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ActiveAndChurnedDynamicsData, ActiveAndChurnedItem } from '../hooks/useRetentionTabData';

export interface ActiveAndChurnedDynamicsCardProps {
  data: ActiveAndChurnedDynamicsData;
}

export function ActiveAndChurnedDynamicsCard({ data }: ActiveAndChurnedDynamicsCardProps) {
  const [periodMode, setPeriodMode] = useState<'month' | 'quarter'>('month');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const items: ActiveAndChurnedItem[] = periodMode === 'month' ? data.monthly : data.quarterly;

  // Chart dimensions inside SVG viewBox="0 0 320 98"
  // Y range: 0 to 250
  const maxY = 250;
  const plotTop = 8;
  const plotBottom = 78;
  const plotHeight = plotBottom - plotTop; // 70px

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxY, val));
    return plotBottom - (clamped / maxY) * plotHeight;
  };

  const yTicks = [250, 200, 150, 100, 50, 0];

  // X range: x from 26 to 312
  const plotLeft = 26;
  const plotRight = 312;
  const plotWidth = plotRight - plotLeft; // 286px

  const count = items.length;
  const slotWidth = plotWidth / count;
  const barWidth = periodMode === 'month' ? 4.5 : 7;
  const barGap = periodMode === 'month' ? 1.5 : 2.5;

  // Calculate coordinates for bars and trend points
  const points = items.map((item, i) => {
    const cx = plotLeft + i * slotWidth + slotWidth / 2;
    const yActive = getY(item.active);
    const yNew = getY(item.newCount);
    const yChurned = getY(item.churnedCount);
    const yTrend = getY(item.trend);

    const totalBarsWidth = barWidth * 3 + barGap * 2;
    const startX = cx - totalBarsWidth / 2;

    return {
      cx,
      xActive: startX,
      xNew: startX + barWidth + barGap,
      xChurned: startX + (barWidth + barGap) * 2,
      yActive,
      yNew,
      yChurned,
      yTrend,
      heightActive: Math.max(1, plotBottom - yActive),
      heightNew: Math.max(1, plotBottom - yNew),
      heightChurned: Math.max(1, plotBottom - yChurned),
      item,
    };
  });

  // Trend line path string
  const trendPathD = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.yTrend.toFixed(1)}`;
  }, '');

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between h-[162px] min-w-0">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1 min-w-0">
          <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
            Динамика активных и ушедших
          </h3>
          <span
            className="text-slate-400 text-[10px] cursor-help font-normal shrink-0"
            title="Динамика активных, новых и прекративших обучение учеников за выбранный период"
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
            aria-label="Период динамики"
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-5.5"
          >
            <option value="month">По месяцам</option>
            <option value="quarter">По кварталам</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        </div>
      </div>

      {/* 2. Legend */}
      <div className="flex items-center gap-3 pt-0.5 text-[9.5px] font-medium text-slate-600">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
          Активные
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
          Новые
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
          Ушли
        </span>
      </div>

      {/* 3. SVG Bar Chart with Trend Line */}
      <div className="relative flex-1 w-full min-h-0 pt-0.5">
        <svg
          viewBox="0 0 320 98"
          className="w-full h-full overflow-visible select-none"
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines & Y-axis labels */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <text
                  x="20"
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px] fill-slate-400 font-medium"
                >
                  {val}
                </text>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke={val === 0 ? '#cbd5e1' : '#f1f5f9'}
                  strokeWidth={val === 0 ? '1' : '0.8'}
                />
              </g>
            );
          })}

          {/* Hover Column Highlight */}
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

          {/* Bars */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Blue Bar: Active */}
              <rect
                x={p.xActive}
                y={p.yActive}
                width={barWidth}
                height={p.heightActive}
                fill="#2563eb"
                rx={1}
                className="transition-opacity duration-150"
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6}
              />
              {/* Green Bar: New */}
              <rect
                x={p.xNew}
                y={p.yNew}
                width={barWidth}
                height={p.heightNew}
                fill="#10b981"
                rx={1}
                className="transition-opacity duration-150"
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6}
              />
              {/* Red Bar: Churned */}
              <rect
                x={p.xChurned}
                y={p.yChurned}
                width={barWidth}
                height={p.heightChurned}
                fill="#f43f5e"
                rx={1}
                className="transition-opacity duration-150"
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6}
              />

              {/* X-axis Label */}
              <text
                x={p.cx}
                y="92"
                textAnchor="middle"
                className={`text-[8.5px] font-medium ${
                  hoveredIndex === i ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                }`}
              >
                {p.item.label}
              </text>

              {/* Invisible touch/mouse target for each column */}
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

          {/* Trend Line (Orange/Amber with dots) */}
          <path
            d={trendPathD}
            fill="none"
            stroke="#f97316"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />

          {points.map((p, i) => (
            <circle
              key={`dot-${i}`}
              cx={p.cx}
              cy={p.yTrend}
              r={hoveredIndex === i ? 3.5 : 2.75}
              fill="#f97316"
              stroke="#ffffff"
              strokeWidth="1.25"
              className="pointer-events-none transition-all duration-150"
            />
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none -top-1 transform -translate-x-1/2 bg-slate-900/90 text-white rounded-md px-2 py-1 text-[9.5px] shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${(points[hoveredIndex].cx / 320) * 100}%`,
            }}
          >
            <div className="font-bold text-[10px] text-slate-200 mb-0.5">
              {points[hoveredIndex].item.fullLabel}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300">Акт: {points[hoveredIndex].item.active}</span>
              <span className="text-emerald-300">Нов: +{points[hoveredIndex].item.newCount}</span>
              <span className="text-rose-300">Ушли: {points[hoveredIndex].item.churnedCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
