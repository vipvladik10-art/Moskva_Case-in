import type { MaxTonnageResponse } from '@/api/types';

interface Props {
  data?: MaxTonnageResponse;
  onClick: () => void;
}

export function TonnageWidget({ data, onClick }: Props) {
  return (
    <div style={{ background: 'var(--c-surface)', padding: 16, borderRadius: 8 }}>
      <h2>Успеть до дождя</h2>
      {data ? (
        <>
          <p style={{ fontSize: 32, margin: '0.5rem 0' }}>
            <strong>{data.recommended_order_t} т</strong>
          </p>
          <small>
            Полезное время: {data.t_useful_min} мин · ограничивает:{' '}
            {data.limiting_factor === 'plant_capacity' ? 'АБЗ' : 'укладчик'}
          </small>
        </>
      ) : (
        <p>Нажмите «Рассчитать», чтобы получить рекомендованный объём заказа.</p>
      )}
      <button onClick={onClick}>Рассчитать</button>
    </div>
  );
}
