import { useState } from 'react';
import type { Site } from '@/api/types';

interface Props {
  sites: Site[];
  rainSiteId: number | null;
  onTriggerStorm: (siteId: number) => void;
  onReset: () => void;
  isLoading: boolean;
}

export function DemoControls({ sites, rainSiteId, onTriggerStorm, onReset, isLoading }: Props) {
  const [siteId, setSiteId] = useState<number>(sites[1]?.id ?? sites[0]?.id ?? 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="muted" style={{ fontSize: 12 }}>
        Запустить дождь на участке:
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
      <div className="row" style={{ gap: 8 }}>
        <button
          onClick={() => onTriggerStorm(siteId)}
          disabled={isLoading}
          style={{ flex: 1 }}
          title="Имитировать внезапные осадки и реакцию системы"
        >
          {isLoading ? 'Запуск…' : 'Запустить дождь'}
        </button>
        <button className="ghost" onClick={onReset} disabled={isLoading} title="Сбросить состояние">
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
