import React, { useEffect, useRef, memo } from "react";

const ParticleCanvas = memo(({ theme }) => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // --- POLISH: Optimizations & Scaling ---
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth < 768;
    let resizeTimeout;

    // --- POLISH: Debounced resize handler for performance ---
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setSize, 100);
    };

    // --- POLISH: Hi-DPI scaling for crisp rendering on Retina displays ---
    function setSize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr); // Scale context to draw at logical pixels
    }
    setSize();
    window.addEventListener("resize", handleResize);

    let raf;
    const items = [];
    const kind = theme.particles.type;

    // --- POLISH: Reduced particle count on mobile for better performance ---
    const baseCount =
      kind === "hearts"
        ? 18
        : kind === "aurora"
        ? 8
        : kind === "neon-dots"
        ? 70
        : 50;
    const count = isMobile ? Math.floor(baseCount * 0.6) : baseCount;

    for (let i = 0; i < count; i++) {
      const rect = canvas.getBoundingClientRect();
      items.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy:
          kind === "hearts"
            ? -Math.random() * 0.6 - 0.15
            : (Math.random() - 0.5) * 0.6,
        r: kind === "aurora" ? Math.random() * 40 + 20 : Math.random() * 2.5 + 1.2,
        a: Math.random() * Math.PI * 2,
        // --- POLISH: Add individual opacity for smoother firefly fade ---
        alpha: kind === "fireflies" ? Math.random() * 0.8 : 0.8,
      });
    }

    const draw = (timestamp) => {
      const t = timestamp * 0.001;
      const { width, height } = canvas.getBoundingClientRect();
      // Clear canvas based on its logical size, not its pixel size
      ctx.clearRect(0, 0, width, height);

      items.forEach((p) => {
        p.x += p.vx + (kind === "hearts" ? Math.sin(p.a) * 0.25 : 0);
        p.y += p.vy;
        p.a += 0.01;

        // Particle wrapping logic
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
        
        // --- POLISH: Smoother, individual firefly flicker effect ---
        if (kind === "fireflies") {
            p.alpha = Math.abs(Math.sin(t + p.a)) * 0.8;
            ctx.globalAlpha = p.alpha;
        } else {
            ctx.globalAlpha = 0.8;
        }

        if (kind === "hearts") {
          ctx.fillStyle = theme.particles.color;
          ctx.font = `${p.r * 10}px serif`;
          ctx.fillText("♥", p.x, p.y);
        } else if (kind === "aurora") {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
          g.addColorStop(0, theme.particles.color);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = theme.particles.color;
          // --- POLISH: Reduced shadowBlur on mobile to improve performance ---
          ctx.shadowBlur = kind === "neon-dots" ? (isMobile ? 6 : 12) : 0;
          ctx.shadowColor = theme.particles.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          // Reset shadow properties after drawing each particle to avoid side effects
          ctx.shadowBlur = 0;
        }
      });

      ctx.globalAlpha = 1.0; // Reset global alpha
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [theme]);

  // --- POLISH: Added inline styles for clean layout integration ---
  return (
    <canvas
      className="particles"
      ref={ref}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
});

export default ParticleCanvas;
