import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TonnageWidget } from '../components/TonnageWidget';

describe('TonnageWidget', () => {
  it('renders empty state', () => {
    render(<TonnageWidget onClick={vi.fn()} />);
    expect(screen.getByText(/рассчитать/i)).toBeInTheDocument();
  });

  it('renders recommended tonnage when data given', () => {
    render(
      <TonnageWidget
        onClick={vi.fn()}
        data={{
          site_id: 1,
          plant_id: 2,
          t_window_min: 240,
          t_useful_min: 147,
          max_tonnage_t: 147,
          limiting_factor: 'plant_capacity',
          recommended_order_t: 140,
          explanation: '',
        }}
      />,
    );
    expect(screen.getByText('140 т')).toBeInTheDocument();
  });
});
