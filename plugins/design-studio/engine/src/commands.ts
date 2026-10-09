import type { Command } from './cli-types.ts';
import { detectCommand } from './commands/detect.ts';
import { inventoryCommand } from './commands/inventory.ts';

export const COMMANDS: Record<string, Command> = { detect: detectCommand, inventory: inventoryCommand };
