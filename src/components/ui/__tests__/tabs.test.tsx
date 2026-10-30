import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsTrigger } from '../tabs';

describe('Tabs orientation', () => {
  it('exposes vertical orientation and uses vertical arrow keys', async () => {
    render(
      <Tabs orientation="vertical" defaultValue="first">
        <TabsList aria-label="Sections">
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = screen.getByRole('tablist', { name: 'Sections' });
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    const first = screen.getByRole('tab', { name: 'First' });
    const second = screen.getByRole('tab', { name: 'Second' });
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(second));
  });
});
