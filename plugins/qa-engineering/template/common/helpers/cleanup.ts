/**
 * Teardown registry for tests that mutate backend data. Register an undo for each created
 * entity; `runAll()` executes them in reverse order and isolates individual errors so one
 * failed teardown does not mask the others (it collects and logs them instead).
 */
export type Teardown = () => Promise<void>;

export interface CleanupFailure {
  label: string;
  message: string;
}

export class CleanupRegistry {
  private readonly items: Array<{ label: string; fn: Teardown }> = [];

  add(label: string, fn: Teardown): void {
    this.items.push({ label, fn });
  }

  /** Runs every undo in reverse; returns the ones that failed (empty when all succeeded). */
  async runAll(): Promise<CleanupFailure[]> {
    const failures: CleanupFailure[] = [];
    const items = [...this.items].reverse();
    this.items.length = 0;
    for (const { label, fn } of items) {
      try {
        await fn();
      } catch (err) {
        failures.push({ label, message: (err as Error).message });
        console.warn(`[cleanup] '${label}' failed (continuing): ${(err as Error).message}`);
      }
    }
    return failures;
  }
}
