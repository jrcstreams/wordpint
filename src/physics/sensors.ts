import Matter from 'matter-js';
import type { LetterBody } from './letters';

export interface SensorEvents {
  onEntered: (id: number, char: string) => void;
  onLeft: (id: number) => void;
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SensorOptions {
  engine: Matter.Engine;
  /** The strict cup interior — letters here are unconditionally counted. */
  interior: Region;
  /**
   * Extra pixels above the rim where stacked overflow letters still count
   * (only if the letter has previously been inside the strict interior).
   */
  stackHeadroom?: number;
  /** Extra pixels of horizontal slack added to the extended region. */
  sideSlack?: number;
  worldHeight: number;
  events: SensorEvents;
  maxActive: number;
  /** ms after exiting the cup before the body is removed and faded */
  exitFadeMs?: number;
  /** ms a letter may live without entering the cup before being culled */
  watchdogMs?: number;
}

interface TrackState {
  /** Currently being counted. */
  insideGlass: boolean;
  /** Has it been inside the strict interior at least once. */
  wasInsideStrict: boolean;
  /** When it transitioned from inside to outside (for floor-fade). */
  exitedAt: number | null;
}

export class Sensors {
  private opts: SensorOptions;
  private tracking = new Map<number, TrackState>();
  private exitFadeMs: number;
  private watchdogMs: number;
  private extended: Region;

  constructor(opts: SensorOptions) {
    this.opts = opts;
    this.exitFadeMs = opts.exitFadeMs ?? 2000;
    this.watchdogMs = opts.watchdogMs ?? 10000;
    const headroom = opts.stackHeadroom ?? 0;
    const slack = opts.sideSlack ?? 0;
    this.extended = {
      x: opts.interior.x - slack,
      y: opts.interior.y - headroom,
      width: opts.interior.width + slack * 2,
      height: opts.interior.height + headroom,
    };
    Matter.Events.on(opts.engine, 'beforeUpdate', this.tick);
  }

  destroy() {
    Matter.Events.off(this.opts.engine, 'beforeUpdate', this.tick);
  }

  /** Returns the current count of active letter bodies. */
  activeCount(): number {
    return this.tracking.size;
  }

  private isLetter(body: Matter.Body): body is LetterBody {
    return (body as LetterBody).letterChar !== undefined;
  }

  private isInside(body: Matter.Body, region: Region): boolean {
    const px = body.position.x;
    const py = body.position.y;
    return (
      px >= region.x &&
      px <= region.x + region.width &&
      py >= region.y &&
      py <= region.y + region.height
    );
  }

  private tick = () => {
    const now = performance.now();
    const world = this.opts.engine.world;
    const bodies = Matter.Composite.allBodies(world);
    const strict = this.opts.interior;
    const extended = this.extended;

    for (const body of bodies) {
      if (!this.isLetter(body)) continue;
      const id = body.letterId;
      let track = this.tracking.get(id);
      if (!track) {
        track = {
          insideGlass: false,
          wasInsideStrict: false,
          exitedAt: null,
        };
        this.tracking.set(id, track);
      }

      const insideStrict = this.isInside(body, strict);
      const insideExtended = this.isInside(body, extended);

      if (insideStrict) {
        track.wasInsideStrict = true;
      }

      // Counted if currently inside the strict cup, OR if the letter has
      // previously been inside the cup and is now in the extended column
      // (i.e. stacked above the rim but still in the cup column).
      const shouldCount =
        insideStrict || (track.wasInsideStrict && insideExtended);

      if (shouldCount && !track.insideGlass) {
        track.insideGlass = true;
        track.exitedAt = null;
        this.opts.events.onEntered(id, body.letterChar);
      } else if (!shouldCount && track.insideGlass) {
        track.insideGlass = false;
        track.exitedAt = now;
        this.opts.events.onLeft(id);
      }

      // Watchdog: never entered the cup and old → cull
      if (!track.insideGlass && track.exitedAt === null) {
        if (now - body.bornAt > this.watchdogMs) {
          Matter.Composite.remove(world, body);
          this.tracking.delete(id);
          continue;
        }
      }

      // Floor fade: exited the cup and lingered long enough → remove
      if (track.exitedAt !== null && now - track.exitedAt > this.exitFadeMs) {
        Matter.Composite.remove(world, body);
        this.tracking.delete(id);
        continue;
      }

      // Below the visible floor → remove immediately
      if (body.position.y > this.opts.worldHeight + 100) {
        if (track.insideGlass) this.opts.events.onLeft(id);
        Matter.Composite.remove(world, body);
        this.tracking.delete(id);
      }
    }
  };

  /** Remove a specific set of letter ids (used by `useWord`). */
  removeLetters(ids: number[]) {
    const world = this.opts.engine.world;
    const idSet = new Set(ids);
    for (const body of Matter.Composite.allBodies(world)) {
      if (!this.isLetter(body)) continue;
      if (!idSet.has(body.letterId)) continue;
      const track = this.tracking.get(body.letterId);
      if (track?.insideGlass) {
        this.opts.events.onLeft(body.letterId);
      }
      Matter.Composite.remove(world, body);
      this.tracking.delete(body.letterId);
    }
  }

  /** Remove every active letter body, regardless of where it is. */
  clearAll() {
    const world = this.opts.engine.world;
    for (const body of Matter.Composite.allBodies(world)) {
      if (!this.isLetter(body)) continue;
      const track = this.tracking.get(body.letterId);
      if (track?.insideGlass) {
        this.opts.events.onLeft(body.letterId);
      }
      Matter.Composite.remove(world, body);
      this.tracking.delete(body.letterId);
    }
  }

  /** True when the cap has been reached and the dispenser should stall. */
  isFull(): boolean {
    return this.tracking.size >= this.opts.maxActive;
  }
}
