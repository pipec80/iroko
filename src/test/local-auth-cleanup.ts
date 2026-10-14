/** Validates an Admin API identifier before interpolation into fixture SQL. */
export function requireUserUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new Error('The fixture Admin API must return a UUID');
  return value;
}

/** Always attempts both cleanup steps while preserving a setup or browser failure. */
export async function withAuthCleanup(
  operation: () => Promise<void>,
  removeAccount: () => void | Promise<void>,
  removeUser: () => Promise<void>,
  report: (error: Error) => void,
): Promise<void> {
  let primaryFailure = false;
  try {
    await operation();
  } catch (error) {
    primaryFailure = true;
    throw error;
  } finally {
    const failures: unknown[] = [];
    for (const cleanup of [removeAccount, removeUser]) {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) {
      const error = new AggregateError(failures, 'Local authenticated fixture cleanup failed');
      if (primaryFailure) report(error);
      else throw error;
    }
  }
}
