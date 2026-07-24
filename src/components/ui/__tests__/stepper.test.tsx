import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Stepper } from '../stepper';

describe('Stepper', () => {
  it('renders one item per step', () => {
    render(<Stepper steps={['Org', 'Invite', 'Plan', 'Branding']} current={0} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('marks the current step as active via aria-current', () => {
    render(<Stepper steps={['Org', 'Invite', 'Plan', 'Branding']} current={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items.at(2)?.getAttribute('aria-current')).toBe('step');
    expect(items.at(0)?.getAttribute('aria-current')).toBeNull();
  });

  it('renders the step labels', () => {
    render(<Stepper steps={['Org', 'Invite']} current={0} />);
    expect(screen.getByText('Org')).toBeDefined();
    expect(screen.getByText('Invite')).toBeDefined();
  });
});
