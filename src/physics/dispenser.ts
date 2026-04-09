import Matter from 'matter-js';
import { ScrabbleBag, createLetterBody, type LetterBody } from './letters';

export interface DispenserOptions {
  world: Matter.World;
  spawnX: number;
  spawnY: number;
  intervalMs?: number;
  jitterX?: number;
  onSpawn?: (body: LetterBody) => void;
}

export class Dispenser {
  private opts: DispenserOptions;
  private bag = new ScrabbleBag();
  private timer: number | null = null;
  private intervalMs: number;
  private jitterX: number;

  constructor(opts: DispenserOptions) {
    this.opts = opts;
    this.intervalMs = opts.intervalMs ?? 100;
    this.jitterX = opts.jitterX ?? 30;
  }

  start() {
    if (this.timer !== null) return;
    const tick = () => {
      this.spawnOne();
      this.timer = window.setTimeout(tick, this.intervalMs);
    };
    tick();
  }

  stop() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  spawnOne() {
    const ch = this.bag.draw();
    const x = this.opts.spawnX + (Math.random() - 0.5) * this.jitterX * 2;
    const body = createLetterBody(ch, x, this.opts.spawnY);
    Matter.Composite.add(this.opts.world, body);
    this.opts.onSpawn?.(body);
  }

  destroy() {
    this.stop();
  }
}
