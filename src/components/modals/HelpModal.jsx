import React from "react";
import Modal from "./Modal.jsx";

const HelpModal = ({ isOpen, onClose }) => {
  const titleId = "help-modal-title";
  const bodyId = "help-modal-body";

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} describedBy={bodyId}>
      <div className="help-modal">
        <header className="help-modal__header">
          <h2 id={titleId} className="help-modal__title">
            How to Play
          </h2>
          <p className="help-modal__subtitle">
            Everything you need to host, join, and make the most of Date Night.
          </p>
        </header>
        <div id={bodyId} className="help-modal__content">
          <section className="help-section" aria-labelledby="help-hosting">
            <h3 id="help-hosting" className="help-section__title">
              Host an Online Multiplayer Session
            </h3>
            <ol className="help-list help-list--numbered">
              <li>Choose the Multiplayer mode on the start screen.</li>
              <li>Tap “Generate Game ID” to create a unique room code.</li>
              <li>Share the code with your partner and keep this screen open.</li>
              <li>Once both players join, only one person should spin at a time.</li>
            </ol>
            <p className="help-note">
              Hosting keeps the wheel, prompts, extreme meter, and timer in sync across devices.
            </p>
          </section>

          <section className="help-section" aria-labelledby="help-joining">
            <h3 id="help-joining" className="help-section__title">
              Join a Multiplayer Game
            </h3>
            <ol className="help-list help-list--numbered">
              <li>Select Multiplayer mode on the start screen.</li>
              <li>Enter the 6-letter Game ID provided by the host.</li>
              <li>Confirm to sync spins, prompts, consequences, and analytics.</li>
              <li>Wait for the host to spin or take turns—never spin at the same time.</li>
            </ol>
          </section>

          <section className="help-section" aria-labelledby="help-modes">
            <h3 id="help-modes" className="help-section__title">
              Game Modes Overview
            </h3>
            <ul className="help-list">
              <li>
                <strong>Single Device:</strong> Classic couple play on one phone with full Firebase-powered prompts,
                analytics, and extreme meter tracking.
              </li>
              <li>
                <strong>Multiplayer:</strong> Two devices stay perfectly in sync through Firestore—including spins,
                prompts, extreme meter, timer, particles, and analytics.
              </li>
              <li>
                <strong>Offline:</strong> No internet required. Uses cached prompts, local custom prompts, and keeps meter,
                timer, and analytics on-device only.
              </li>
              <li>
                <strong>Party:</strong> Gather 3–8 players with group-friendly Truth or Dare prompts, a shared extreme
                meter, and optional sync across devices so everyone stays on the same turn.
              </li>
            </ul>
          </section>

          <section className="help-section" aria-labelledby="help-faq">
            <h3 id="help-faq" className="help-section__title">
              FAQ & Quick Tips
            </h3>
            <ul className="help-list help-list--bulleted">
              <li>
                <strong>What is the Extreme Meter?</strong> Each accepted round fills the meter. The glow and pulse
                intensify as it climbs until it guarantees an extreme prompt.
              </li>
              <li>
                <strong>Why do extreme rounds appear early?</strong> Surprise extreme rounds can trigger randomly for
                excitement—they don’t reset the meter, so the guaranteed extreme still arrives at 100%.
              </li>
              <li>
                <strong>How does the timer work?</strong> Every prompt has a 30-second countdown. Let it expire and the
                game will auto-refuse the challenge, trigger the matching consequence, and log the timeout in analytics.
              </li>
              <li>
                <strong>Need a refresher later?</strong> Reopen this help panel anytime from Settings via the ℹ️ button.
              </li>
            </ul>
          </section>
        </div>
        <footer className="help-modal__footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </Modal>
  );
};

export default HelpModal;
