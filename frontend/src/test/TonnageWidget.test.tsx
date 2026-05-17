import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TonnageWidget } from '../components/TonnageWidget';

describe('TonnageWidget', () => {
  it('renders loading state without data', () => {
    render(<TonnageWidget />);
    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
  });

  it('renders recommended tonnage when data given', () => {
    render(
      <TonnageWidget
        data={{
          site_id: 1,
          plant_id: 2,
          t_window_min: 240,
          t_useful_min: 147,
          max_tonnage_t: 147,
          limiting_factor: 'plant_capacity',
          recommended_order_t: 140,
          explanation: 'тест',
        }}
      />,
    );
    expect(screen.getByText('140')).toBeInTheDocument();
  });
});
