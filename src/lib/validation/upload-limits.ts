/** Shared ceiling for uploads whose Storage buckets already allow 5 MiB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Reserve transport headroom for multipart metadata and reject hidden large fields. */
export function hasOversizedUploadFields(formData: FormData, fileField: string): boolean {
  let otherBytes = 0;
  let primarySeen = false;
  for (const [name, value] of formData) {
    if (name === fileField && !primarySeen) {
      primarySeen = true;
      continue;
    }
    otherBytes +=
      typeof value === 'string' ? new TextEncoder().encode(value).byteLength : value.size;
    if (otherBytes > 512 * 1024) return true;
  }
  return false;
}
