import Matter from 'matter-js';

// Standard 100-tile Scrabble distribution (excluding blanks).
const SCRABBLE_DISTRIBUTION: Record<string, number> = {
  a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9,
  j: 1, k: 1, l: 4, m: 2, n: 6, o: 8, p: 2, q: 1, r: 6,
  s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1,
};

export class ScrabbleBag {
  private bag: string[] = [];
  private rng: () => number;
  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.refill();
  }
  private refill() {
    for (const [ch, n] of Object.entries(SCRABBLE_DISTRIBUTION)) {
      for (let i = 0; i < n; i++) this.bag.push(ch);
    }
  }
  draw(): string {
    if (this.bag.length === 0) this.refill();
    const i = Math.floor(this.rng() * this.bag.length);
    const [ch] = this.bag.splice(i, 1);
    return ch;
  }
}

const TILE_SIZE = 38;
const textureCache = new Map<string, string>();

function makeLetterTexture(char: string): string {
  const cached = textureCache.get(char);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d')!;
  // Tile background
  ctx.fillStyle = '#f3e9c6';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#8a7a3c';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
  // Glyph
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.toUpperCase(), TILE_SIZE / 2, TILE_SIZE / 2 + 1);
  const url = c.toDataURL();
  textureCache.set(char, url);
  return url;
}

export interface LetterBody extends Matter.Body {
  letterChar: string;
  letterId: number;
  bornAt: number;
}

let nextLetterId = 1;

export function createLetterBody(
  char: string,
  x: number,
  y: number,
): LetterBody {
  const body = Matter.Bodies.rectangle(x, y, TILE_SIZE, TILE_SIZE, {
    density: 0.002,
    friction: 0.4,
    restitution: 0.15,
    chamfer: { radius: 4 },
    render: {
      sprite: {
        texture: makeLetterTexture(char),
        xScale: 1,
        yScale: 1,
      },
    },
  }) as LetterBody;
  body.letterChar = char;
  body.letterId = nextLetterId++;
  body.bornAt = performance.now();
  return body;
}

export const LETTER_TILE_SIZE = TILE_SIZE;
