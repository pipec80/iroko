import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CspNonceProvider, useCspNonce } from './csp-nonce-provider';

function LateConsumer() {
  return <span data-testid="nonce">{useCspNonce()}</span>;
}

describe('document nonce provider', () => {
  it('provides the original document nonce to consumers mounted after navigation', () => {
    const view = render(
      <CspNonceProvider nonce="document-nonce">
        <span>initial</span>
      </CspNonceProvider>,
    );
    view.rerender(
      <CspNonceProvider nonce="rsc-response-nonce">
        <LateConsumer />
      </CspNonceProvider>,
    );
    expect(screen.getByTestId('nonce').textContent).toBe('document-nonce');
  });
});
