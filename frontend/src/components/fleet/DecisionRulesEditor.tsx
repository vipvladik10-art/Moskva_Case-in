import type { DecisionKind, DecisionRule } from '@/api/types';

const TRIGGERS = [
  'weather.rain_started',
  'weather.rain_ended',
  'weather.forecast_risk',
  'logistics.truck_redirected',
  'maintenance.weather_idle_created',
  'maintenance.post_rain_created',
];

const KINDS: DecisionKind[] = ['system', 'weather', 'redirect', 'maintenance'];

interface Props {
  rules: DecisionRule[];
  onChange: (rules: DecisionRule[]) => void;
}

export function DecisionRulesEditor({ rules, onChange }: Props) {
  const update = (index: number, patch: Partial<DecisionRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const add = () => {
    const id = `rule_${Date.now()}`;
    onChange([
      ...rules,
      {
        id,
        trigger: 'weather.forecast_risk',
        kind: 'weather',
        message_template: 'Сообщение для {site_name}',
        enabled: true,
      },
    ]);
  };

  const remove = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  return (
    <div>
      {rules.map((rule, i) => (
        <div key={rule.id} className={`rule-card ${rule.enabled ? '' : 'disabled'}`}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <label className="checkbox-row" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => update(i, { enabled: e.target.checked })}
              />
              <span className="muted" style={{ fontSize: 12 }}>
                {rule.id}
              </span>
            </label>
            <button type="button" className="ghost danger-text" onClick={() => remove(i)}>
              Удалить
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label className="muted" style={{ fontSize: 11 }}>
              Триггер
              <select
                value={rule.trigger}
                onChange={(e) => update(i, { trigger: e.target.value })}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted" style={{ fontSize: 11 }}>
              Тип в журнале
              <select
                value={rule.kind}
                onChange={(e) => update(i, { kind: e.target.value as DecisionKind })}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="muted" style={{ fontSize: 11 }}>
              Шаблон сообщения
              <input
                value={rule.message_template}
                onChange={(e) => update(i, { message_template: e.target.value })}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}>
        + Добавить правило
      </button>
    </div>
  );
}
