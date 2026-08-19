declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
  toHaveLength(length: number): void;
  toBeGreaterThan(value: number): void;
  toContain(value: unknown): void;
};