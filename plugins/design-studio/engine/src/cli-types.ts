export interface CliIO { out: (line: string) => void; err: (line: string) => void }
export type Args = Record<string, string | boolean>;
export type Command = (args: Args, io: CliIO) => Promise<number>;
