import { useEffect, useRef, memo } from "react";

const ParticleCanvas = memo(({ theme }) => {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");

    function size() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    size();
    window.addEventListener("resize", size);

    let raf,
      t = 0;
    const items = [];
    const kind = theme.particles.type;
    const count =
      kind === "hearts"
        ? 18
        : kind === "aurora"
        ? 8
        : kind === "neon-dots"
        ? 70
        : 50;

    for (let i = 0; i < count; i++) {
      items.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy:
          kind === "hearts"
            ? -Math.random() * 0.6 - 0.15
            : (Math.random() - 0.5) * 0.6,
        r: kind === "aurora" ? Math.random() * 40 + 10 : Math.random() * 2.5 + 1.2,
        a: Math.random() * Math.PI * 2,
      });
    }

    const draw = (ts) => {
      t = ts * 0.001;
      ctx.clearRect(0, 0, c.width, c.height);

      items.forEach((p) => {
        p.x += p.vx + (kind === "hearts" ? Math.sin(p.a) * 0.25 : 0);
        p.y += p.vy;
        p.a += 0.01;

        if (p.x < -20) p.x = c.width + 20;
        if (p.x > c.width + 20) p.x = -20;
        if (p.y < -20) p.y = c.height + 20;
        if (p.y > c.height + 20) p.y = -20;

        ctx.globalAlpha = kind === "fireflies" ? Math.abs(Math.sin(t + p.a)) * 0.8 : 0.8;

        if (kind === "hearts") {
          ctx.fillStyle = theme.particles.color;
          ctx.font = `${p.r * 10}px serif`;
          ctx.fillText("♥", p.x, p.y);
        } else if (kind === "aurora") {
          const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.25, p.x, p.y, p.r * 2.2);
          g.addColorStop(0, theme.particles.color);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = theme.particles.color;
          ctx.shadowBlur = kind === "neon-dots" ? 10 : 0;
          ctx.shadowColor = theme.particles.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, [theme]);

  return <canvas className="particles" ref={ref} />;
});

export default ParticleCanvas;
