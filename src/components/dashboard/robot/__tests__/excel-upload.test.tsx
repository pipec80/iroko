import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_UPLOAD_BYTES } from '@/lib/validation/upload-limits';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/robot-config', () => ({ uploadRobotConfigAction: mocks.upload }));

import { ExcelUploadDropzone } from '../excel-upload';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function selectedFile(size: number, name = 'data.xlsx', type = XLSX_MIME) {
  const file = new File(['data'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function choose(file: File) {
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
}

describe('Robot Excel selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ success: true });
  });

  it.each([MAX_UPLOAD_BYTES - 1, MAX_UPLOAD_BYTES])('accepts %i bytes', async (size) => {
    render(<ExcelUploadDropzone />);
    choose(selectedFile(size));
    fireEvent.click(screen.getByRole('button', { name: 'upload_btn' }));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
  });

  it('drops an earlier valid selection after a larger or wrong-type replacement', () => {
    render(<ExcelUploadDropzone />);
    choose(selectedFile(100));
    expect((screen.getByRole('button', { name: 'upload_btn' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    choose(selectedFile(MAX_UPLOAD_BYTES + 1));
    expect((screen.getByRole('button', { name: 'upload_btn' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(mocks.upload).not.toHaveBeenCalled();
    choose(selectedFile(100, 'spoof.xlsx', 'text/plain'));
    expect((screen.getByRole('button', { name: 'upload_btn' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('shows transport rejection and permits another attempt', async () => {
    mocks.upload.mockRejectedValueOnce(new Error('transport'));
    render(<ExcelUploadDropzone />);
    choose(selectedFile(100));
    fireEvent.click(screen.getByRole('button', { name: 'upload_btn' }));
    await screen.findByText('error_processing');
    choose(selectedFile(100));
    fireEvent.click(screen.getByRole('button', { name: 'upload_btn' }));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(2));
  });
});
