import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUndoableDraft } from '@/hooks/useUndoableDraft';
import {
  useDecisionRules,
  useFleet,
  useDeleteMapMarker,
  useDeletePlant,
  useDeleteSite,
  useMapMarkers,
  usePlants,
  useSites,
  useUpdateDecisionRules,
  useUpdateFleet,
} from '@/api/hooks';
import type { DecisionRule, FleetCatalog } from '@/api/types';
import { DecisionRulesEditor } from '@/components/fleet/DecisionRulesEditor';
import { FleetVehiclesEditor } from '@/components/fleet/FleetVehiclesEditor';
import { FleetWorkersEditor } from '@/components/fleet/FleetWorkersEditor';
import { MapObjectsList } from '@/components/fleet/MapObjectsList';
import { useAuthStore } from '@/store/auth';

type Tab = 'vehicles' | 'workers' | 'rules' | 'map' | 'advanced';

export function FleetPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [tab, setTab] = useState<Tab>('vehicles');
  const { data: fleet, isLoading: fleetLoading } = useFleet();
  const { data: rules = [], isLoading: rulesLoading } = useDecisionRules();
  const { data: sites = [] } = useSites();
  const { data: plants = [] } = usePlants();
  const { data: markers = [] } = useMapMarkers();
  const updateFleet = useUpdateFleet();
  const updateRules = useUpdateDecisionRules();
  const deleteSite = useDeleteSite();
  const deletePlant = useDeletePlant();
  const deleteMarker = useDeleteMapMarker();

  const [fleetDraft, setFleetDraft, resetFleetDraft] = useUndoableDraft<FleetCatalog>(
    null,
    'Справочник парка',
  );
  const [rulesDraft, setRulesDraft, resetRulesDraft] = useUndoableDraft<DecisionRule[]>(
    [],
    'Правила решений',
  );
  const [fleetJson, setFleetJson] = useState('');
  const [rulesJson, setRulesJson] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fleet) resetFleetDraft(fleet);
  }, [fleet, resetFleetDraft]);

  useEffect(() => {
    resetRulesDraft(rules);
  }, [rules, resetRulesDraft]);

  useEffect(() => {
    if (fleetDraft) setFleetJson(JSON.stringify(fleetDraft, null, 2));
  }, [fleetDraft]);

  useEffect(() => {
    setRulesJson(JSON.stringify(rulesDraft ?? [], null, 2));
  }, [rulesDraft]);

  const saveFleet = () => {
    if (!fleetDraft) return;
    setError(null);
    updateFleet.mutate(fleetDraft, {
      onSuccess: () => setMessage('Парк и штат сохранены'),
      onError: () => setError('Не удалось сохранить парк'),
    });
  };

  const saveRules = () => {
    if (!rulesDraft) return;
    setError(null);
    updateRules.mutate(rulesDraft, {
      onSuccess: () => setMessage('Правила решений сохранены'),
      onError: () => setError('Не удалось сохранить правила'),
    });
  };

  const saveFleetJson = () => {
    try {
      const parsed = JSON.parse(fleetJson) as FleetCatalog;
      setFleetDraft(parsed);
      setError(null);
      updateFleet.mutate(parsed, {
        onSuccess: () => setMessage('JSON парка применён'),
      });
    } catch {
      setError('Некорректный JSON парка');
    }
  };

  const saveRulesJson = () => {
    try {
      const parsed = JSON.parse(rulesJson) as DecisionRule[];
      if (!Array.isArray(parsed)) throw new Error('not array');
      setRulesDraft(parsed);
      setError(null);
      updateRules.mutate(parsed, {
        onSuccess: () => setMessage('JSON правил применён'),
      });
    } catch {
      setError('Некорректный JSON правил');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'vehicles', label: 'Техника' },
    { id: 'workers', label: 'Штат' },
    { id: 'rules', label: 'Правила решений' },
    { id: 'map', label: 'Объекты на карте' },
    { id: 'advanced', label: 'JSON' },
  ];

  return (
    <div style={{ padding: 18, maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 8px' }}>Справочники</h1>
      <p className="muted" style={{ margin: '0 0 12px' }}>
        Парк, штат и правила журнала. Точки на карте — в{' '}
        <Link to="/?edit=1">режиме редактирования карты</Link>.
        {!isAdmin && ' Редактирование доступно после входа администратора.'}
        {isAdmin && ' Отмена — кнопка «Отменить» в шапке или Ctrl+Z.'}
      </p>

      <div className="catalog-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="muted" style={{ color: 'var(--c-ok)', fontSize: 12 }}>
          {message}
        </p>
      )}
      {error && <p className="danger-text">{error}</p>}

      {tab === 'vehicles' && (
        <section className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Парк техники</h2>
          {fleetLoading || !fleetDraft ? (
            <p className="muted">Загрузка…</p>
          ) : (
            <>
              <FleetVehiclesEditor
                vehicles={fleetDraft.vehicles}
                onChange={(vehicles) => setFleetDraft({ ...fleetDraft, vehicles })}
              />
              <button
                type="button"
                onClick={saveFleet}
                disabled={!isAdmin || updateFleet.isPending}
                style={{ marginTop: 12 }}
                title={isAdmin ? undefined : 'Только для администратора'}
              >
                {updateFleet.isPending ? 'Сохранение…' : 'Сохранить технику'}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'workers' && (
        <section className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Штат по разрядам</h2>
          {fleetLoading || !fleetDraft ? (
            <p className="muted">Загрузка…</p>
          ) : (
            <>
              <FleetWorkersEditor
                workers={fleetDraft.workers}
                onChange={(workers) => setFleetDraft({ ...fleetDraft, workers })}
              />
              <button
                type="button"
                onClick={saveFleet}
                disabled={!isAdmin || updateFleet.isPending}
                style={{ marginTop: 12 }}
                title={isAdmin ? undefined : 'Только для администратора'}
              >
                {updateFleet.isPending ? 'Сохранение…' : 'Сохранить штат'}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'rules' && (
        <section className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Правила журнала решений</h2>
          {rulesLoading ? (
            <p className="muted">Загрузка…</p>
          ) : (
            <>
              <DecisionRulesEditor rules={rulesDraft ?? []} onChange={setRulesDraft} />
              <button
                type="button"
                onClick={saveRules}
                disabled={!isAdmin || updateRules.isPending}
                style={{ marginTop: 12 }}
                title={isAdmin ? undefined : 'Только для администратора'}
              >
                {updateRules.isPending ? 'Сохранение…' : 'Сохранить правила'}
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'map' && (
        <section className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Объекты на карте</h2>
          <MapObjectsList
            sites={sites}
            plants={plants}
            markers={markers}
            onDeleteSite={
              isAdmin
                ? (id, _name) =>
                    deleteSite.mutate(id, { onSuccess: () => setMessage('Участок удалён') })
                : undefined
            }
            onDeletePlant={
              isAdmin
                ? (id, _name) => deletePlant.mutate(id, { onSuccess: () => setMessage('АБЗ удалён') })
                : undefined
            }
            onDeleteMarker={
              isAdmin
                ? (id, _name) =>
                    deleteMarker.mutate(id, { onSuccess: () => setMessage('Метка удалена') })
                : undefined
            }
          />
        </section>
      )}

      {tab === 'advanced' && (
        <section className="card">
          <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Расширенный JSON</h2>
          <p className="muted" style={{ fontSize: 12 }}>
            Для опытных пользователей. Обычно достаточно вкладок выше.
          </p>
          <h3 style={{ fontSize: 14 }}>Парк</h3>
          <textarea
            value={fleetJson}
            onChange={(e) => setFleetJson(e.target.value)}
            rows={10}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 12,
              marginBottom: 8,
            }}
          />
          <button
            type="button"
            className="ghost"
            onClick={saveFleetJson}
            disabled={!isAdmin}
            style={{ marginBottom: 16 }}
          >
            Применить JSON парка
          </button>
          <h3 style={{ fontSize: 14 }}>Правила</h3>
          <textarea
            value={rulesJson}
            onChange={(e) => setRulesJson(e.target.value)}
            rows={10}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
          />
          <button type="button" className="ghost" onClick={saveRulesJson} disabled={!isAdmin}>
            Применить JSON правил
          </button>
        </section>
      )}
    </div>
  );
}
