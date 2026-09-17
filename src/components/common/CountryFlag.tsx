'use client';

import React from 'react';

interface CountryFlagProps {
  country: 'ru' | 'en' | 'de' | string;
  className?: string;
  size?: number;
}

export function CountryFlag({ country, className = '', size = 16 }: CountryFlagProps) {
  const code = country.toLowerCase();

  if (code === 'ru') {
    return (
      <svg
        width={size}
        height={(size * 3) / 4}
        viewBox="0 0 640 480"
        className={`inline-block rounded-xs shadow-2xs shrink-0 ${className}`}
        aria-label="Флаг России"
      >
        <rect width="640" height="480" fill="#fff" />
        <rect width="640" height="320" y="160" fill="#0039a6" />
        <rect width="640" height="160" y="320" fill="#d52b1e" />
      </svg>
    );
  }

  if (code === 'en' || code === 'gb') {
    return (
      <svg
        width={size}
        height={(size * 3) / 4}
        viewBox="0 0 640 480"
        className={`inline-block rounded-xs shadow-2xs shrink-0 ${className}`}
        aria-label="Flag of the United Kingdom"
      >
        <clipPath id="flag-gb-clip">
          <path d="M0 0v480h640V0z" />
        </clipPath>
        <g clipPath="url(#flag-gb-clip)">
          <path fill="#012169" d="M0 0h640v480H0z" />
          <path stroke="#fff" strokeWidth="60" d="M0 0l640 480M640 0L0 480" />
          <path stroke="#c8102e" strokeWidth="40" d="M0 0l640 480M640 0L0 480" />
          <path stroke="#fff" strokeWidth="100" d="M320 0v480M0 240h640" />
          <path stroke="#c8102e" strokeWidth="60" d="M320 0v480M0 240h640" />
        </g>
      </svg>
    );
  }

  if (code === 'de') {
    return (
      <svg
        width={size}
        height={(size * 3) / 4}
        viewBox="0 0 640 480"
        className={`inline-block rounded-xs shadow-2xs shrink-0 ${className}`}
        aria-label="Flagge Deutschlands"
      >
        <rect width="640" height="160" fill="#000" />
        <rect width="640" height="160" y="160" fill="#d00" />
        <rect width="640" height="160" y="320" fill="#ffce00" />
      </svg>
    );
  }

  return <span className={`text-xs font-bold ${className}`}>{country.toUpperCase()}</span>;
}
