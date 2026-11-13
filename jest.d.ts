declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;

interface JestMatchers {
  toHaveLength(length: number): void;
  toBeGreaterThan(value: number): void;
  toBeGreaterThanOrEqual(value: number): void;
  toBeLessThan(value: number): void;
  toBeCloseTo(value: number, precision?: number): void;
  toBe(value: unknown): void;
  toEqual(value: unknown): void;
  toContain(value: unknown): void;
}

declare const expect: ((value: unknown) => JestMatchers) & {
  arrayContaining(values: unknown[]): unknown;
};