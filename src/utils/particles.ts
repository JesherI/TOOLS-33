export interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  connections: number[];
  velocityX: number;
  velocityY: number;
}

export interface ParticleConfig {
  particleCount?: number;
  connectionDistance?: number;
  mouseInfluenceRadius?: number;
  mouseInfluenceStrength?: number;
  returnSpeed?: number;
  colors?: {
    particle?: string;
    connection?: string;
  };
}

export const defaultParticleConfig: Required<ParticleConfig> = {
  particleCount: 0, // Calculado dinámicamente
  connectionDistance: 120,
  mouseInfluenceRadius: 300,
  mouseInfluenceStrength: 0.03,
  returnSpeed: 0.05,
  colors: {
    particle: "#f97316",
    connection: "rgba(249, 115, 22,",
  },
};

export function createParticles(
  width: number,
  height: number,
  density: number = 15000
): Particle[] {
  const count = Math.floor((width * height) / density);
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.3 + 0.1;

    particles.push({
      x,
      y,
      baseX: x,
      baseY: y,
      size: Math.random() * 1.5 + 0.5,
      connections: [],
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
    });
  }

  return particles;
}

export function updateParticlePosition(
  particle: Particle,
  mouseX: number,
  mouseY: number,
  width: number,
  height: number,
  config: ParticleConfig = {}
): void {
  const {
    mouseInfluenceRadius = defaultParticleConfig.mouseInfluenceRadius,
    mouseInfluenceStrength = defaultParticleConfig.mouseInfluenceStrength,
    returnSpeed = defaultParticleConfig.returnSpeed,
  } = config;

  // Movimiento autónomo
  particle.baseX += particle.velocityX;
  particle.baseY += particle.velocityY;

  // Rebote en los bordes
  if (particle.baseX < 0 || particle.baseX > width) {
    particle.velocityX *= -1;
    particle.baseX = Math.max(0, Math.min(width, particle.baseX));
  }
  if (particle.baseY < 0 || particle.baseY > height) {
    particle.velocityY *= -1;
    particle.baseY = Math.max(0, Math.min(height, particle.baseY));
  }

  // Influencia del mouse
  const dx = mouseX - particle.baseX;
  const dy = mouseY - particle.baseY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < mouseInfluenceRadius && distance > 0) {
    const force = (mouseInfluenceRadius - distance) / mouseInfluenceRadius;
    particle.x = particle.baseX - dx * force * mouseInfluenceStrength;
    particle.y = particle.baseY - dy * force * mouseInfluenceStrength;
  } else {
    // Volver suavemente a la posición base
    particle.x += (particle.baseX - particle.x) * returnSpeed;
    particle.y += (particle.baseY - particle.y) * returnSpeed;
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  config: ParticleConfig = {}
): void {
  const {
    connectionDistance = defaultParticleConfig.connectionDistance,
    colors = defaultParticleConfig.colors,
  } = config;

  const particleColor = colors.particle ?? defaultParticleConfig.colors.particle!;
  const connectionColorBase = colors.connection ?? defaultParticleConfig.colors.connection!;

  particles.forEach((particle, i) => {
    // Dibujar partícula
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particleColor;
    ctx.fill();

    // Dibujar conexiones
    particle.connections = [];
    particles.forEach((other, j) => {
      if (i >= j) return; // Evitar duplicados

      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < connectionDistance) {
        particle.connections.push(j);
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        const opacity = 0.15 * (1 - dist / connectionDistance);
        ctx.strokeStyle = `${connectionColorBase} ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });
  });
}
