import type { MaxTonnageResponse } from '@/api/types';

interface Props {
  data?: MaxTonnageResponse;
}

export function TonnageWidget({ data }: Props) {
  return (
    <div className="card">
      <h3>Успеть до дождя</h3>
      {data ? (
        <>
          <div className="kpi">
            {data.recommended_order_t}
            <small>т к заказу</small>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Максимум по расчёту: <strong>{data.max_tonnage_t} т</strong>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Окно: {data.t_window_min} мин · полезное: {data.t_useful_min} мин
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="badge info">
              Ограничивает: {data.limiting_factor === 'plant_capacity' ? 'АБЗ' : 'укладчик'}
            </span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
            {data.explanation}
          </p>
        </>
      ) : (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Загрузка расчёта…
        </p>
      )}
    </div>
  );
}
