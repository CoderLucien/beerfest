const DEFAULT_SEED = 20260804;

let currentSeed = DEFAULT_SEED;

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number = DEFAULT_SEED) {
  currentSeed = seed;
  const rng = mulberry32(seed);
  return {
    next: () => rng(),
    int: (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min,
    pick: <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)],
    pickN: <T>(arr: T[], n: number): T[] => {
      const shuffled = [...arr].sort(() => rng() - 0.5);
      return shuffled.slice(0, n);
    },
    chance: (pct: number) => rng() * 100 < pct,
    float: (min: number, max: number) => rng() * (max - min) + min,
    reset: (newSeed?: number) => {
      currentSeed = newSeed ?? DEFAULT_SEED;
    },
    getSeed: () => currentSeed,
  };
}

export const rng = createRng(DEFAULT_SEED);
