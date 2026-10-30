import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from '../global-error';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

describe('GlobalError', () => {
  it('offers a retry without exposing private error details', () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error('private database detail')} reset={reset} />);

    expect(screen.queryByText(/private database detail/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /retry|reintentar/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
