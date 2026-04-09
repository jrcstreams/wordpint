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

// Tile size — dropped from 26 → 19 → 17 to keep growing cup capacity
// without changing the bar layout. Area scales with side², so going
// 19 → 17 fits ~25% more letters in the same glass. The texture is
// rendered at 3× internally so the small glyph stays crisp on retina.
const TILE_SIZE = 17;
const TEX_SCALE = 3;
const textureCache = new Map<string, string>();

/**
 * Premium ivory tile with embossed serif glyph and faint horizontal
 * wood-grain. No point value. Tuned to stay legible at the smaller size.
 */
function makeLetterTexture(char: string): string {
  const cached = textureCache.get(char);
  if (cached) return cached;

  const size = TILE_SIZE * TEX_SCALE;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.scale(TEX_SCALE, TEX_SCALE);

  const r = 3.5;
  const inset = 1;
  const w = TILE_SIZE - inset * 2;
  const h = TILE_SIZE - inset * 2;

  // Outer drop shadow (subtle, baked)
  ctx.save();
  ctx.shadowColor = 'rgba(20, 12, 4, 0.32)';
  ctx.shadowBlur = 2.4;
  ctx.shadowOffsetY = 1;

  // Tile body — warm ivory with vertical light gradient
  const body = ctx.createLinearGradient(0, inset, 0, inset + h);
  body.addColorStop(0, '#fbf3dd');
  body.addColorStop(0.5, '#f1e3b9');
  body.addColorStop(1, '#dcc78a');
  ctx.fillStyle = body;
  roundedRect(ctx, inset, inset, w, h, r);
  ctx.fill();
  ctx.restore();

  // Wood-grain horizontal lines (sparser at this size)
  ctx.save();
  roundedRect(ctx, inset, inset, w, h, r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(90, 56, 24, 0.08)';
  ctx.lineWidth = 0.4;
  for (let y = inset + 2.5; y < inset + h - 0.5; y += 2) {
    ctx.beginPath();
    ctx.moveTo(inset + 0.5, y + Math.sin(y * 0.7) * 0.2);
    ctx.lineTo(inset + w - 0.5, y + Math.cos(y * 0.6) * 0.2);
    ctx.stroke();
  }
  ctx.restore();

  // Inner bevel — top highlight, bottom shadow
  ctx.save();
  roundedRect(ctx, inset, inset, w, h, r);
  ctx.clip();

  const topGrad = ctx.createLinearGradient(0, inset, 0, inset + 3);
  topGrad.addColorStop(0, 'rgba(255, 250, 230, 0.85)');
  topGrad.addColorStop(1, 'rgba(255, 250, 230, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(inset, inset, w, 3);

  const botGrad = ctx.createLinearGradient(0, inset + h - 4, 0, inset + h);
  botGrad.addColorStop(0, 'rgba(60, 36, 12, 0)');
  botGrad.addColorStop(1, 'rgba(60, 36, 12, 0.32)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(inset, inset + h - 4, w, 4);
  ctx.restore();

  // Crisp ink border
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1a1a1a';
  roundedRect(ctx, inset, inset, w, h, r);
  ctx.stroke();

  // Embossed glyph (scaled with tile)
  ctx.font = '900 13px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2 + 0.5;

  // Highlight (offset up-left)
  ctx.fillStyle = 'rgba(255, 250, 230, 0.55)';
  ctx.fillText(char.toUpperCase(), cx - 0.3, cy - 0.3);
  // Ink glyph
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(char.toUpperCase(), cx, cy);

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
    density: 0.0024,
    friction: 0.6,
    frictionStatic: 0.65,
    restitution: 0.06,
    chamfer: { radius: 3 },
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
