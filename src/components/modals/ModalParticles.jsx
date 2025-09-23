import React, { useEffect, useState } from "react";
import { createParticleBurst } from "../../utils/particles.js";

const ModalParticles = ({ category, intensity, isActive }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const resolvedCategory = category ?? "truth";
    const resolvedIntensity = intensity ?? "normal";
    const burst = createParticleBurst(resolvedCategory, resolvedIntensity);
    setParticles(burst);

    return () => {
      setParticles([]);
    };
  }, [category, intensity, isActive]);

  return (
    <div className="modal-particles" aria-hidden>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="modal-particle"
          style={particle.style}
        >
          {particle.icon}
        </span>
      ))}
    </div>
  );
};

export default ModalParticles;
