import { describe, it, expect } from 'vitest';

import { webhookEndpointSchema } from '../webhooks';

describe('webhookEndpointSchema', () => {
  const valid = { url: 'https://api.example.com/hooks', events: ['member.joined'] };

  it('should accept a valid https endpoint with catalog events', () => {
    expect(webhookEndpointSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject http:// urls', () => {
    const result = webhookEndpointSchema.safeParse({ ...valid, url: 'http://api.example.com/x' });
    expect(result.success).toBe(false);
  });

  it.each([
    'https://localhost/x',
    'https://127.0.0.1/x',
    'https://10.0.0.5/x',
    'https://192.168.1.1/x',
    'https://172.16.0.1/x',
    'https://internal.local/x',
  ])('should reject private host %s', (url) => {
    expect(webhookEndpointSchema.safeParse({ ...valid, url }).success).toBe(false);
  });

  it('should reject a malformed url', () => {
    expect(webhookEndpointSchema.safeParse({ ...valid, url: 'not-a-url' }).success).toBe(false);
  });

  it('should reject events outside the catalog', () => {
    const result = webhookEndpointSchema.safeParse({ ...valid, events: ['no.such.event'] });
    expect(result.success).toBe(false);
  });

  it('should reject an empty events array', () => {
    expect(webhookEndpointSchema.safeParse({ ...valid, events: [] }).success).toBe(false);
  });

  it('should reject a description over 200 chars', () => {
    const result = webhookEndpointSchema.safeParse({ ...valid, description: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });
});
