cat > docs/AGENTS.md << 'EOF'
# ULTIMATE BACKLOG SPEC (Finalized)

This is the single source of truth. You must follow it exactly.  
Never remove or regress features.  
Never introduce git markers, placeholders, or invalid code.  

============================================================
1. CORE GAMEPLAY
============================================================
- Wheel has three slices: Truth, Dare, Trivia.
- Slice labels must always be visually centered and styled cohesively (readable font, proper color contrast).
- Extreme-only rounds = Truth/Dare only (never Trivia).
- Random extreme rounds do NOT reset Extreme Meter.
- Prompts & consequences live in prompts.js, categorized by type/intensity.
- Trivia modal buttons = Correct/Incorrect (not Refuse).

... (rest of backlog goes here, exactly as we finalized) ...

============================================================
11. SAFEGUARD CLAUSE
============================================================
Never remove or disable these features:
- Wheel spin noises.
- Swipe-based spin physics.
- Confetti burst on extreme announcement.
- Centered wheel labels.
- Modal-triggered sounds.
- Multiplayer sync.
- PWA install support.
EOF
