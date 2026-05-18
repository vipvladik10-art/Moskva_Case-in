import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useDecisionsForTask,
  useMaintenance,
  usePatchMaintenanceStatus,
  useSites,
  useTrucks,
  type MaintenanceFilters,
} from '@/api/hooks';
import type { MaintenancePhase, MaintenanceTask, MaintenanceTriggerSource } from '@/api/types';

const PHASE_LABELS: Record<string, string> = {
  during_rain: 'Во время дождя',
  after_rain: 'После дождя',
};

const TRIGGER_LABELS: Record<string, string> = {
  forecast_risk: 'Прогнозный риск',
  demo_storm: 'Демо: внезапный дождь',
  rain_ended: 'Дождь закончился',
};

const selectStyle: React.CSSProperties = {
  background: 'var(--c-surface-2)',
  border: '1px solid var(--c-border)',
  color: 'var(--c-text)',
  padding: '6px 10px',
  borderRadius: 8,
  fontSize: 13,
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function TaskCard({
  task,
  machineLabel,
  conflict,
  expanded,
  onToggle,
}: {
  task: MaintenanceTask;
  machineLabel: string;
  conflict: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const patch = usePatchMaintenanceStatus();
  const { data: linkedDecisions = [] } = useDecisionsForTask(expanded ? task.id : undefined);
  const phase = PHASE_LABELS[task.phase] ?? task.phase;
  const trigger = TRIGGER_LABELS[task.trigger_source] ?? task.trigger_source;

  return (
    <div
      className="site-card"
      style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 14 }}
    >
      <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <button
          type="button"
          className="ghost"
          onClick={onToggle}
          style={{ textAlign: 'left', padding: 0, flex: 1 }}
        >
          <div className="name">{machineLabel}</div>
          <div className="meta" style={{ fontSize: 11 }}>
            {task.destination} · {formatDate(task.created_at)}
          </div>
        </button>
        <div className="row" style={{ gap: 6 }}>
          {conflict && <span className="badge danger">конфликт</span>}
          <span className={`badge ${task.phase === 'after_rain' ? 'info' : 'warn'}`}>{phase}</span>
        </div>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        <strong>Триггер:</strong> {trigger}
        {task.reason_code ? (
          <>
            {' '}
            · <strong>код:</strong> {task.reason_code}
          </>
        ) : null}
      </p>

      {expanded ? (
        <>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            <strong>Почему сейчас:</strong> {task.why}
          </p>
          {task.what ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              <strong>Что:</strong> {task.what}
            </p>
          ) : null}
          {task.crew_instructions ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              <strong>Бригада:</strong> {task.crew_instructions}
            </p>
          ) : null}
          {task.equipment?.length > 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              <strong>Оборудование:</strong> {task.equipment.join(', ')}
            </p>
          ) : null}
          {linkedDecisions.length > 0 ? (
            <div style={{ fontSize: 12 }}>
              <strong>Журнал:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {linkedDecisions.map((d) => (
                  <li key={d.id ?? d.at} className="muted">
                    {d.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {task.status === 'open' ? (
              <button
                type="button"
                className="ghost"
                disabled={patch.isPending}
                onClick={() => patch.mutate({ id: task.id, status: 'in_progress' })}
              >
                В работу
              </button>
            ) : null}
            {task.status === 'open' || task.status === 'in_progress' ? (
              <>
                <button
                  type="button"
                  className="ghost"
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ id: task.id, status: 'done' })}
                >
                  Выполнено
                </button>
                <button
                  type="button"
                  className="ghost danger-text"
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ id: task.id, status: 'cancelled' })}
                >
                  Отменить
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
        <span className="muted">{task.assigned_to}</span>
        <span className="badge warn">{task.status}</span>
      </div>
    </div>
  );
}

export function MaintenancePage() {
  const { data: sites = [] } = useSites();
  const [siteId, setSiteId] = useState<number | ''>('');
  const [phase, setPhase] = useState<MaintenancePhase | ''>('');
  const [triggerSource, setTriggerSource] = useState<MaintenanceTriggerSource | ''>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filters: MaintenanceFilters = useMemo(() => {
    const f: MaintenanceFilters = { status: 'open' };
    if (siteId !== '') f.site_id = siteId;
    if (phase) f.phase = phase;
    if (triggerSource) f.trigger_source = triggerSource;
    return f;
  }, [siteId, phase, triggerSource]);

  const { data: tasks = [], isLoading } = useMaintenance(filters);
  const { data: trucks = [] } = useTrucks();

  const conflicts = useMemo(() => {
    const keys = new Set<string>();
    const dup = new Set<string>();
    for (const t of tasks) {
      if (t.phase !== 'during_rain' || !t.machine_id) continue;
      const k = `${t.site_id}:${t.machine_id}`;
      if (keys.has(k)) dup.add(k);
      keys.add(k);
    }
    return dup;
  }, [tasks]);

  const duringRain = tasks.filter((t) => t.phase === 'during_rain');
  const afterRain = tasks.filter((t) => t.phase === 'after_rain');

  const renderGroup = (title: string, group: MaintenanceTask[]) => {
    if (group.length === 0) return null;
    return (
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 10px' }}>{title}</h2>
        <div className="site-list" style={{ gap: 12 }}>
          {group.map((t) => {
            const truck = t.machine_id ? trucks.find((x) => x.id === t.machine_id) : undefined;
            const label = truck
              ? `Самосвал ${truck.plate}`
              : t.machine_id
                ? `Машина #${t.machine_id}`
                : 'Участок / бригада';
            const conflict =
              t.phase === 'during_rain' &&
              !!t.machine_id &&
              conflicts.has(`${t.site_id}:${t.machine_id}`);
            return (
              <TaskCard
                key={t.id}
                task={t}
                machineLabel={label}
                conflict={conflict}
                expanded={expandedId === t.id}
                onToggle={() => setExpandedId((id) => (id === t.id ? null : t.id))}
              />
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: '0 0 14px' }}>Наряды на ТО</h1>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value === '' ? '' : Number(e.target.value))}
          style={selectStyle}
        >
          <option value="">Все участки</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value as MaintenancePhase | '')}
          style={selectStyle}
        >
          <option value="">Все фазы</option>
          <option value="during_rain">Во время дождя</option>
          <option value="after_rain">После дождя</option>
        </select>
        <select
          value={triggerSource}
          onChange={(e) => setTriggerSource(e.target.value as MaintenanceTriggerSource | '')}
          style={selectStyle}
        >
          <option value="">Все триггеры</option>
          <option value="forecast_risk">Прогноз</option>
          <option value="demo_storm">Демо-дождь</option>
          <option value="rain_ended">После дождя</option>
        </select>
        <Link to="/" className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
          На карту →
        </Link>
      </div>

      {isLoading ? <p className="muted">Загрузка…</p> : null}
      {!isLoading && tasks.length === 0 ? (
        <p className="muted">
          Нет открытых нарядов по выбранным фильтрам. Наряды создаются по прогнозу (фон) или
          демо-кнопками в правой панели.
        </p>
      ) : null}

      {renderGroup('Во время дождя', duringRain)}
      {renderGroup('После дождя', afterRain)}
    </div>
  );
}
