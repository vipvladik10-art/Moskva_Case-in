import type { WeatherSummary } from '@/api/types';

interface Props {
  state?: WeatherSummary['state'] | 'rain' | 'clear' | 'risk' | 'unknown';
  size?: number;
  title?: string;
}

export function WeatherIcon({ state = 'unknown', size = 18, title }: Props) {
  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    fill: 'none',
    role: 'img' as const,
    'aria-label': title ?? state,
  };

  if (state === 'rain') {
    return (
      <svg {...common}>
        <title>{title ?? 'Дождь'}</title>
        <path
          d="M7 16a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18 9a3.5 3.5 0 0 1-.5 6.99H7Z"
          fill="#cdd9ec"
          stroke="#7f8aa1"
          strokeWidth="0.8"
        />
        <line x1="9" y1="18" x2="8" y2="22" stroke="#4ea1ff" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="13" y1="18" x2="12" y2="22" stroke="#4ea1ff" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="17" y1="18" x2="16" y2="22" stroke="#4ea1ff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (state === 'risk') {
    return (
      <svg {...common}>
        <title>{title ?? 'Риск осадков'}</title>
        <circle cx="16.5" cy="9" r="3.5" fill="#ffd66b" stroke="#d6a020" strokeWidth="0.6" />
        <path
          d="M6 17a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 17 10a3.5 3.5 0 0 1-.5 6.99H6Z"
          fill="#cdd9ec"
          stroke="#7f8aa1"
          strokeWidth="0.8"
        />
        <line x1="9" y1="19" x2="8" y2="22" stroke="#4ea1ff" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="14" y1="19" x2="13" y2="22" stroke="#4ea1ff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (state === 'clear') {
    return (
      <svg {...common}>
        <title>{title ?? 'Ясно'}</title>
        <circle cx="12" cy="12" r="4" fill="#ffd66b" stroke="#d6a020" strokeWidth="0.6" />
        <g stroke="#ffd66b" strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.9" y1="4.9" x2="6.8" y2="6.8" />
          <line x1="17.2" y1="17.2" x2="19.1" y2="19.1" />
          <line x1="4.9" y1="19.1" x2="6.8" y2="17.2" />
          <line x1="17.2" y1="6.8" x2="19.1" y2="4.9" />
        </g>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <title>{title ?? 'Нет данных'}</title>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#97a3bf" strokeWidth="1.4" strokeDasharray="3 2" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontFamily="system-ui, sans-serif"
        fill="#97a3bf"
      >
        ?
      </text>
    </svg>
  );
}
