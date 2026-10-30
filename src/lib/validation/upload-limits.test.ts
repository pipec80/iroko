import { describe, expect, it } from 'vitest';

import { hasOversizedUploadFields, MAX_UPLOAD_BYTES } from './upload-limits';

describe('upload transport budget', () => {
  it('keeps the existing 5 MiB file ceiling', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it('rejects large hidden fields without charging the selected file twice', () => {
    const data = new FormData();
    data.append('logo', new File([new Uint8Array(8)], 'logo.png', { type: 'image/png' }));
    expect(hasOversizedUploadFields(data, 'logo')).toBe(false);
    data.append('extra', 'x'.repeat(512 * 1024 + 1));
    expect(hasOversizedUploadFields(data, 'logo')).toBe(true);
  });

  it('charges duplicate primary files to the transport budget', () => {
    const data = new FormData();
    data.append('logo', new File(['x'], 'one.png', { type: 'image/png' }));
    const duplicate = new File(['x'], 'two.png', { type: 'image/png' });
    Object.defineProperty(duplicate, 'size', { value: 512 * 1024 + 1 });
    data.append('logo', duplicate);
    expect(hasOversizedUploadFields(data, 'logo')).toBe(true);
  });
});
