import React, { useEffect, useRef } from 'react';

const ParticleCanvas = ({ theme }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const particles = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      speedY: Math.random() * 0.5 + 0.2,
      offset: i * 10,
    }));

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = theme?.particles?.color || 'rgba(255, 255, 255, 0.6)';
      particles.forEach((particle) => {
        const y = (particle.y + particle.speedY * time * 0.02 + particle.offset) % canvas.height;
        ctx.beginPath();
        ctx.arc(particle.x, y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
};

export default ParticleCanvas;
