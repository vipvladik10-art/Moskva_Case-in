import type { DecisionEntry } from '@/api/types';

interface Props {
  decisions: DecisionEntry[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function DecisionLog({ decisions }: Props) {
  if (decisions.length === 0) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Журнал пуст. Действия системы появятся здесь.
      </p>
    );
  }
  return (
    <div className="decision-log">
      {decisions.map((d, i) => (
        <div key={`${d.at}-${i}`} className={`entry ${d.kind}`}>
          <span className="dot" />
          <span className="time">{formatTime(d.at)}</span>
          <span>{d.message}</span>
        </div>
      ))}
    </div>
  );
}
