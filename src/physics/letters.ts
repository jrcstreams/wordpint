import Matter from 'matter-js';

// Standard 100-tile Scrabble distribution (excluding blanks).
const SCRABBLE_DISTRIBUTION: Record<string, number> = {
  a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9,
  j: 1, k: 1, l: 4, m: 2, n: 6, o: 8, p: 2, q: 1, r: 6,
  s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1,
};

// Standard Scrabble point values for the small corner numeral.
const SCRABBLE_POINTS: Record<string, number> = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1,
  j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1,
  s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10,
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

const TILE_SIZE = 42;
// Render at 2x for crisp glyphs on retina, then downscale via sprite scale.
const TEX_SCALE = 2;
const textureCache = new Map<string, string>();

function makeLetterTexture(char: string): string {
  const cached = textureCache.get(char);
  if (cached) return cached;

  const size = TILE_SIZE * TEX_SCALE;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.scale(TEX_SCALE, TEX_SCALE);

  const r = 6; // corner radius
  const inset = 1;

  // Drop shadow (subtle, baked into the sprite)
  ctx.save();
  ctx.shadowColor = 'rgba(26, 16, 8, 0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // Tile body — amber radial gradient (this is the "colored liquid" pop)
  const grad = ctx.createRadialGradient(
    TILE_SIZE / 2,
    TILE_SIZE / 2 - 4,
    2,
    TILE_SIZE / 2,
    TILE_SIZE / 2,
    TILE_SIZE * 0.7,
  );
  grad.addColorStop(0, '#fad97c');
  grad.addColorStop(0.55, '#e8a838');
  grad.addColorStop(1, '#b87a1e');
  ctx.fillStyle = grad;
  roundedRect(ctx, inset, inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2, r);
  ctx.fill();
  ctx.restore();

  // Border
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#5a3818';
  roundedRect(ctx, inset, inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2, r);
  ctx.stroke();

  // Inner highlight line (top)
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(inset + 4, inset + 3);
  ctx.lineTo(TILE_SIZE - inset - 4, inset + 3);
  ctx.stroke();

  // Glyph — bold serif, dark ink
  ctx.fillStyle = '#2a1810';
  ctx.font = '800 24px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.toUpperCase(), TILE_SIZE / 2, TILE_SIZE / 2 + 1);

  // Point value in bottom-right
  const points = SCRABBLE_POINTS[char] ?? 1;
  ctx.font = '600 9px "EB Garamond", Georgia, serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#3a2410';
  ctx.fillText(String(points), TILE_SIZE - 5, TILE_SIZE - 4);

  const url = c.toDataURL();
  textureCache.set(char, url);
  return url;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
    density: 0.0022,
    friction: 0.55,
    frictionStatic: 0.6,
    restitution: 0.08,
    chamfer: { radius: 5 },
    render: {
      sprite: {
        texture: makeLetterTexture(char),
        xScale: 1 / TEX_SCALE,
        yScale: 1 / TEX_SCALE,
      },
    },
  }) as LetterBody;
  body.letterChar = char;
  body.letterId = nextLetterId++;
  body.bornAt = performance.now();
  return body;
}

export const LETTER_TILE_SIZE = TILE_SIZE;
