export interface ParsedArgs {
  flags: Record<string, string>;
  positional: string[];
}

export function parseArgs(args: string[]): ParsedArgs {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

export function requireFlag(args: ParsedArgs, key: string, label?: string): string {
  const val = args.flags[key];
  if (!val || val === 'true') {
    throw new Error(`Missing required flag: --${key}${label ? ` (${label})` : ''}`);
  }
  return val;
}
