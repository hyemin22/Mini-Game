const Matter = require('matter-js');
const { Engine, World, Bodies, Body, Composite } = Matter;

const WORLD_WIDTH = 280;
const GROUND_Y = 420;
const BLOCK_HEIGHT = 22;
const DROP_GAP = 130; // how far above the current stack top a new block spawns
const MIN_BLOCK_WIDTH = 46;
const MAX_BLOCK_WIDTH = 92;
const TOPPLE_ANGLE = 0.6; // ~34 degrees — beyond this a block counts as toppled
const OFF_WORLD_Y = GROUND_Y + 200; // fell through/away entirely
const RAINBOW_CHANCE = 1 / 30;

class StackWorld {
  constructor() {
    this.engine = Engine.create();
    this.engine.gravity.y = 1;
    this.engine.positionIterations = 20;
    this.engine.velocityIterations = 16;
    this.engine.constraintIterations = 4;
    this.engine.enableSleeping = true;
    this.blocks = []; // [{ body, width, height }]

    const ground = Bodies.rectangle(WORLD_WIDTH / 2, GROUND_Y + 20, WORLD_WIDTH * 4, 40, {
      isStatic: true,
      friction: 1,
      restitution: 0,
    });
    const leftWall = Bodies.rectangle(-40, GROUND_Y - 300, 20, 900, { isStatic: true });
    const rightWall = Bodies.rectangle(WORLD_WIDTH + 40, GROUND_Y - 300, 20, 900, { isStatic: true });
    Composite.add(this.engine.world, [ground, leftWall, rightWall]);
  }

  rollBlockSpec() {
    const width = Math.round(MIN_BLOCK_WIDTH + Math.random() * (MAX_BLOCK_WIDTH - MIN_BLOCK_WIDTH));
    const isRainbow = Math.random() < RAINBOW_CHANCE;
    return { width, isRainbow };
  }

  currentTopY() {
    if (this.blocks.length === 0) return GROUND_Y;
    return this.blocks.reduce((min, b) => Math.min(min, b.body.position.y - b.height / 2), GROUND_Y);
  }

  // offsetX: pixels from world center, clamped to keep the block roughly in-world
  dropBlock(offsetX, width, isRainbow) {
    const half = width / 2;
    const x = Math.max(half + 5, Math.min(WORLD_WIDTH - half - 5, WORLD_WIDTH / 2 + offsetX));
    const y = this.currentTopY() - DROP_GAP;
    const body = Bodies.rectangle(x, y, width, BLOCK_HEIGHT, {
      restitution: 0,
      friction: 0.95,
      frictionStatic: 1.2,
      density: 0.01,
      slop: 0.01,
    });
    Body.setAngle(body, (Math.random() - 0.5) * 0.03);
    Composite.add(this.engine.world, body);
    const entry = { body, width, height: BLOCK_HEIGHT, isRainbow: !!isRainbow };
    this.blocks.push(entry);
    return entry;
  }

  // Removes every block except `keepEntry`, and rests it directly on the ground.
  clearBelow(keepEntry) {
    const toRemove = this.blocks.filter(b => b !== keepEntry).map(b => b.body);
    if (toRemove.length > 0) Composite.remove(this.engine.world, toRemove);
    Body.setPosition(keepEntry.body, { x: keepEntry.body.position.x, y: GROUND_Y - keepEntry.height / 2 });
    Body.setVelocity(keepEntry.body, { x: 0, y: 0 });
    Body.setAngularVelocity(keepEntry.body, 0);
    Body.setAngle(keepEntry.body, 0);
    this.blocks = [keepEntry];
  }

  step(deltaMs) {
    Engine.update(this.engine, deltaMs);
  }

  maxSpeed() {
    return this.blocks.reduce((max, b) => Math.max(max, Body.getSpeed(b.body), Math.abs(b.body.angularVelocity)), 0);
  }

  isCollapsed() {
    return this.blocks.some(b => Math.abs(b.body.angle) > TOPPLE_ANGLE || b.body.position.y > OFF_WORLD_Y);
  }

  snapshot() {
    return this.blocks.map(b => ({
      x: b.body.position.x,
      y: b.body.position.y,
      angle: b.body.angle,
      width: b.width,
      height: b.height,
      isRainbow: b.isRainbow,
    }));
  }
}

module.exports = { StackWorld, WORLD_WIDTH, GROUND_Y };
