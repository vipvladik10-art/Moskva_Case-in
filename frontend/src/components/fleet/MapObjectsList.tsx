import { Link } from 'react-router-dom';
import type { MapMarker, Plant, Site } from '@/api/types';
import type { MapEditEntityType } from '@/store/ui';
import { deleteActionLabel, deleteConfirmMessage } from '@/lib/mapCatalogLabels';

interface Props {
  sites: Site[];
  plants: Plant[];
  markers: MapMarker[];
  onDeleteSite?: (id: number, name: string) => void;
  onDeletePlant?: (id: number, name: string) => void;
  onDeleteMarker?: (id: number, name: string) => void;
}

function confirmDelete(type: MapEditEntityType, name: string, onConfirm: () => void) {
  if (window.confirm(deleteConfirmMessage(type, name))) {
    onConfirm();
  }
}

function ObjectRow({
  title,
  type,
  id,
  name,
  onDelete,
}: {
  title: string;
  type: MapEditEntityType;
  id: number;
  name: string;
  onDelete?: () => void;
}) {
  return (
    <div className="map-object-row">
      <span>
        <strong>{title}</strong> · {name}
      </span>
      <div className="row" style={{ gap: 6, flexShrink: 0 }}>
        <Link to={`/?edit=1&focus=${id}&type=${type}`} className="ghost" style={{ fontSize: 12 }}>
          На карте
        </Link>
        {onDelete ? (
          <button
            type="button"
            className="ghost danger-text"
            style={{ fontSize: 12 }}
            onClick={() => confirmDelete(type, name, onDelete)}
          >
            {deleteActionLabel(type)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MapObjectsList({
  sites,
  plants,
  markers,
  onDeleteSite,
  onDeletePlant,
  onDeleteMarker,
}: Props) {
  return (
    <div className="map-object-list">
      <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
        Удаление с подтверждением. На карте: режим редактирования → клик по маркеру → кнопка с
        типом объекта (например, «Удалить участок»).
      </p>
      {sites.map((s) => (
        <ObjectRow
          key={`s-${s.id}`}
          title={`Участок ${s.id}`}
          type="site"
          id={s.id}
          name={s.name}
          onDelete={onDeleteSite ? () => onDeleteSite(s.id, s.name) : undefined}
        />
      ))}
      {plants.map((p) => (
        <ObjectRow
          key={`p-${p.id}`}
          title={`АБЗ ${p.id}`}
          type="plant"
          id={p.id}
          name={p.name}
          onDelete={onDeletePlant ? () => onDeletePlant(p.id, p.name) : undefined}
        />
      ))}
      {markers.map((m) => (
        <ObjectRow
          key={`m-${m.id}`}
          title={`Метка ${m.id}`}
          type="marker"
          id={m.id}
          name={m.name}
          onDelete={onDeleteMarker ? () => onDeleteMarker(m.id, m.name) : undefined}
        />
      ))}
    </div>
  );
}

