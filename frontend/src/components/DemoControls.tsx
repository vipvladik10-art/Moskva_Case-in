import { useState } from 'react';
import type { Site } from '@/api/types';

interface Props {
  sites: Site[];
  rainSiteId: number | null;
  onTriggerStorm: (siteId: number) => void;
  onEndRain: () => void;
  onReset: () => void;
  isLoading: boolean;
  canReset?: boolean;
}

export function DemoControls({
  sites,
  rainSiteId,
  onTriggerStorm,
  onEndRain,
  onReset,
  isLoading,
  canReset = false,
}: Props) {
  const [siteId, setSiteId] = useState<number>(sites[1]?.id ?? sites[0]?.id ?? 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="muted" style={{ fontSize: 12 }}>
        Имитировать дождь на участке:
      </label>
      <select
        value={siteId}
        onChange={(e) => setSiteId(Number(e.target.value))}
        style={{
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
          color: 'var(--c-text)',
          padding: '8px 10px',
          borderRadius: 8,
        }}
      >
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => onTriggerStorm(siteId)}
          disabled={isLoading}
          style={{ flex: 1, minWidth: 140 }}
          title="Имитировать внезапные осадки и реакцию системы"
        >
          {isLoading ? 'Запуск…' : 'Демо: внезапный дождь'}
        </button>
        {rainSiteId && (
          <button
            className="ghost"
            onClick={onEndRain}
            disabled={isLoading}
            title="Снять дождь и создать наряды после осадков"
          >
            Дождь закончился
          </button>
        )}
        <button
          className="ghost"
          onClick={onReset}
          disabled={isLoading || !canReset}
          title={canReset ? 'Сбросить состояние' : 'Только для администратора'}
        >
          Сброс
        </button>
      </div>
      {rainSiteId && (
        <span className="badge danger" style={{ alignSelf: 'flex-start' }}>
          Активный дождь: участок №{rainSiteId}
        </span>
      )}
    </div>
  );
}
