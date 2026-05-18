import { describe, expect, it } from 'vitest';
import type { MaintenanceTask } from '@/api/types';

function groupByPhase(tasks: MaintenanceTask[]) {
  return {
    during: tasks.filter((t) => t.phase === 'during_rain'),
    after: tasks.filter((t) => t.phase === 'after_rain'),
  };
}

describe('MaintenancePage grouping', () => {
  it('splits tasks by phase', () => {
    const tasks: MaintenanceTask[] = [
      {
        id: 1,
        machine_id: 1,
        site_id: 2,
        destination: 'A',
        what: 'w1',
        why: 'y',
        crew_instructions: '',
        equipment: [],
        phase: 'during_rain',
        reason: '',
        reason_code: 'weather_idle',
        trigger_source: 'demo_storm',
        dedup_key: '1',
        status: 'open',
        assigned_to: '',
        priority: 'normal',
        created_at: '',
        decision_ids: [],
        created_by: 'system',
      },
      {
        id: 2,
        machine_id: null,
        site_id: 2,
        destination: 'A',
        what: 'w2',
        why: 'y',
        crew_instructions: '',
        equipment: [],
        phase: 'after_rain',
        reason: '',
        reason_code: 'post_rain:x',
        trigger_source: 'rain_ended',
        dedup_key: '2',
        status: 'open',
        assigned_to: '',
        priority: 'normal',
        created_at: '',
        decision_ids: [],
        created_by: 'system',
      },
    ];
    const g = groupByPhase(tasks);
    expect(g.during).toHaveLength(1);
    expect(g.after).toHaveLength(1);
  });
});
