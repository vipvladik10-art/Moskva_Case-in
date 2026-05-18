import type { MapEditEntityType } from '@/store/ui';

const TYPE_LABELS: Record<MapEditEntityType, string> = {
  site: 'участок',
  plant: 'АБЗ',
  marker: 'метку',
};

const TYPE_LABELS_NOM: Record<MapEditEntityType, string> = {
  site: 'Участок',
  plant: 'АБЗ',
  marker: 'Метка',
};

export function deleteActionLabel(type: MapEditEntityType): string {
  return `Удалить ${TYPE_LABELS[type]}`;
}

export function deleteConfirmMessage(type: MapEditEntityType, name: string): string {
  return `Удалить ${TYPE_LABELS[type]} «${name}»?`;
}

export function selectionLabel(type: MapEditEntityType, name: string): string {
  return `${TYPE_LABELS_NOM[type]}: ${name}`;
}
