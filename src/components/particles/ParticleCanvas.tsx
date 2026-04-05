import { useEffect, useRef, useCallback } from "react";
import {
  Particle,
  ParticleConfig,
  createParticles,
  updateParticlePosition,
  drawParticles,
} from "../../utils";
import { useAnimationFrame } from "../../hooks";

interface ParticleCanvasProps {
  className?: string;
  config?: ParticleConfig;
  density?: number;
}

export function ParticleCanvas({
  className = "",
  config = {},
  density = 15000,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    dimensionsRef.current = {
      width: canvas.width,
      height: canvas.height,
    };

    particlesRef.current = createParticles(canvas.width, canvas.height, density);
  }, [density]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }, [initParticles]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    const { width, height } = dimensionsRef.current;
    const mouse = mouseRef.current;

    // Actualizar posiciones
    particles.forEach((particle) => {
      updateParticlePosition(particle, mouse.x, mouse.y, width, height, config);
    });

    // Dibujar
    drawParticles(ctx, particles, config);
  }, [config]);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleResize, handleMouseMove]);

  useAnimationFrame(animate, true);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${className}`}
      style={{
        background: "radial-gradient(ellipse at center, #1a0a00 0%, #000000 100%)",
      }}
    />
  );
}
