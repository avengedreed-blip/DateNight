# ULTIMATE BACKLOG SPEC (Date Night)

This is the single source of truth. You must follow it exactly. Never remove or regress features. Never introduce git markers, placeholders, or invalid code.

---

## 1. 🎡 Core Gameplay
- Wheel has three slices: Truth, Dare, Trivia.  
- Slice labels must always be visually centered.  
- Extreme-only rounds = Truth/Dare only (never Trivia).  
- Random extreme rounds do NOT reset Extreme Meter.  
- Prompts & consequences live in prompts.js, categorized by type/intensity.  
- Trivia modal buttons = Correct/Incorrect (not refuse).  

## 2. ⚡ Extreme Meter
- Fills incrementally each round.  
- Pulses faster/stronger as it fills.  
- 100% = guaranteed extreme round.  
- Resets only after meter-triggered extreme.  
- Random extreme rounds do not reset meter.  

## 3. ⏱️ Round Timer
- 30-second countdown in every prompt modal.  
- Timeout = auto-refusal → consequence.  
- Timeout tracked in analytics.  
- Timer synced in multiplayer.  

## 4. 🎆 Particle Feedback
- Particles scale with intensity (Normal < Spicy < Extreme).  
- Truth: 💡 / 💋 / ❤️‍🔥  
- Dare: ⭐ / 🔥 / 🔗  
- Trivia: ❓❗  
- Consequence: ☁️ / 😈 / 💀  
- Stops cleanly when modal closes.  

## 5. 🎨 Themes
- Four base themes: Classic Dark, Romantic Glow, Playful Neon, Mystic Night.  
- Custom Theme Builder: colors + wheel recolor + music upload.  
- Saved locally, persists.  
- Smooth transitions: music crossfade (1s), background fade, instant wheel recolor.  

## 6. 🎶 Audio & Haptics
- Assets: click.wav, spin-loop.wav, refusal-boo.wav, spicy-giggle.wav, extreme-wooo.wav, fanfare.wav.  
- Rules:  
  - Wheel spin sound plays with spin animation.  
  - Modal-related sounds fire **simultaneously with modal appearance**.  
  - Button clicks fire instantly on press.  
- Haptics (mobile): light = button, medium = spin start, heavy = extreme.  

## 7. 🎮 Multiplayer Sync
- Firebase Firestore for game state.  
- Game doc: wheel, prompts, extreme meter, timer.  
- Player subcollection: streaks, refusals, trivia stats.  
- One spin at a time → broadcast to all clients.  
- Timer, consequences, meter synced.  
- Player name shown in action logs.  

## 8. 📊 Analytics & Rewards
- Track: rounds, refusals, streaks, trivia accuracy, timeouts.  
- Rewards:  
  - Streak Badges (Bronze/Silver/Gold/Legendary).  
  - Extreme Adrenaline Bar → unlock bonus extreme prompts.  
  - Trivia Brain Streak → bonus trivia round.  
  - Coward Penalty → 3 refusals = double consequence.  
- Dashboard with graphs + highlights.  

## 9. 💻 Tech & Infra
- React + Vite.  
- Firebase Firestore sync.  
- Local storage fallback.  
- PWA support (installable on iOS/Android).  
- Future: Capacitor/Expo for standalone app.  

## 10. 🧪 Workflow Rules
- Branch: always `new_main`. Never create new branches.  
- No git markers, placeholders, or invalid code.  
- After every edit:  
  - Test in CodeSandbox.  
  - Verify: wheel spins w/ sounds, labels centered, modals open w/ synced sounds, particles fire, meter pulses, multiplayer sync intact, analytics update, themes/music transitions.  
- Provide screenshot proof after each working update.  
- Stage, commit, and push directly to `new_main`. Repo must remain clean and production-ready.  

## 11. 🚫 Safeguard Clause
Never remove or disable these features:  
- Wheel spin noises.  
- Swipe-based spin physics.  
- Confetti burst on extreme announcement.  
- Centered wheel labels.  
- Modal-triggered sounds.  
- Multiplayer sync.  
- PWA install support.  

If adding new features, all existing features above must remain fully functional.
