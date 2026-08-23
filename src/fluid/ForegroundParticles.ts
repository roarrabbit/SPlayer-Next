/**
 * 前景微粒系统
 * 响应高频的微小光点/流体颗粒，增加空间层次感
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;
}

export class ForegroundParticles {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles = 60;
  private highEnergy = 0;
  private bassEnergy = 0;
  private running = false;
  private animHandle = 0;
  private lastTime = 0;
  private spawnAccumulator = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2d context");
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number, scale: number) {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.ceil(width * this.dpr * scale);
    this.canvas.height = Math.ceil(height * this.dpr * scale);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
  }

  updateAudioEnergy(high: number, bass: number) {
    this.highEnergy = high;
    this.bassEnergy = bass;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animHandle) {
      cancelAnimationFrame(this.animHandle);
      this.animHandle = 0;
    }
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animHandle = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const spawnRate = 2 + this.highEnergy * 8 + this.bassEnergy * 4;
    this.spawnAccumulator += spawnRate * dt;

    while (this.spawnAccumulator >= 1 && this.particles.length < this.maxParticles) {
      this.spawnAccumulator -= 1;
      this.spawnParticle();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 2 * dt; // 上浮加速

      const lifeRatio = p.life / p.maxLife;
      p.alpha = Math.sin(lifeRatio * Math.PI) * 0.6;
    }
  }

  private spawnParticle() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const p: Particle = {
      x: Math.random() * w,
      y: h + 10,
      vx: (Math.random() - 0.5) * 20,
      vy: -(20 + Math.random() * 40 + this.highEnergy * 30),
      size: 1 + Math.random() * 2 + this.highEnergy * 2,
      alpha: 0,
      life: 2 + Math.random() * 3,
      maxLife: 2 + Math.random() * 3,
      hue: 200 + Math.random() * 60,
    };

    this.particles.push(p);
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      const screenX = p.x;
      const screenY = p.y;

      if (screenX < -10 || screenX > w + 10 || screenY < -10 || screenY > h + 10) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(screenX, screenY, p.size * this.dpr, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
      ctx.fill();
    }
  }

  dispose() {
    this.stop();
    this.particles = [];
  }
}
