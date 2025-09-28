/*
 * Utility for generating a fresh set of random prompts each time a new game
 * begins. These prompts are blended into the existing prompt pool by the
 * application but are not persisted across sessions. The generator creates
 * prompts for each category (truth, dare, trivia and consequence) and for
 * each intensity tier where applicable. Trivia prompts do not have tiers.
 *
 * The content of these prompts is intentionally lightweight and
 * relationship‑focused. Feel free to adjust the templates or add your own
 * phrases to enrich the experience. Each call returns new arrays that
 * can safely be mutated (e.g. shifted) without affecting other games.
 */

// Helper to shuffle an array in place using Fisher–Yates.
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generate a new set of prompts for the current game. If a mode is
 * specified, it can be used to tailor the content (e.g. party mode could
 * generate more group‑oriented prompts). Currently the mode parameter is
 * unused but remains for future expansion.
 *
 * @param {object} options
 * @param {string|null} [options.mode] The current game mode ('together', 'multiplayer', 'offline', 'party', etc.)
 * @returns {object} An object containing prompt arrays for each category/intensity
 */
export function generateRandomGamePrompts({ mode = null } = {}) {
  // Define templates for each category and intensity. These prompts should
  // complement the built‑in prompt set without duplicating it verbatim.
  const truthPrompts = {
    normal: [
      "What is something about your partner that always makes you smile?",
      "What is your partner's most endearing quirk?",
      "What is a small habit you have that you'd like to improve for your partner?",
      "What memory with your partner do you cherish the most?",
      "What has been the biggest lesson your partner has taught you?",
    ],
    spicy: [
      "What is your favorite outfit on your partner and why?",
      "Where on your partner's body do you most like to be kissed?",
      "What is a flirtatious text you've always wanted to send your partner?",
      "What physical gesture from your partner turns you on the most?",
      "Describe a sexy scenario with your partner that you have been fantasizing about.",
    ],
    extreme: [
      "Describe in detail the most intimate moment you've shared with your partner.",
      "What is a sexual desire you've been too shy to ask your partner for?",
      "Share your wildest fantasy involving your partner and a place.",
      "What is the most adventurous thing you'd like to try with your partner?",
      "What is a secret fantasy you have that might shock your partner?",
    ],
  };

  const darePrompts = {
    normal: [
      "Give your partner a genuine compliment every minute for the next three minutes.",
      "Switch seats with your partner and maintain eye contact for one minute.",
      "Let your partner style your hair in a silly way for the next round.",
      "Do a dramatic reading of a love letter to your partner.",
      "Hold your partner's hand and tell them a joke until they laugh.",
    ],
    spicy: [
      "Trace a heart on your partner's arm using just your lips.",
      "Whisper the first thing you would do to your partner if you were alone.",
      "Give your partner a slow dance with your hands on their hips.",
      "Blindfold your partner and kiss them in three places of your choice.",
      "Let your partner kiss you somewhere unexpected.",
    ],
    extreme: [
      "Use only your mouth to write your partner's name somewhere on their body.",
      "Give your partner a short massage using only your tongue.",
      "Let your partner remove an article of your clothing without using their hands.",
      "Stand behind your partner and whisper a steamy scenario you'd like to act out with them.",
      "Allow your partner to gently bite or nibble your earlobe for thirty seconds.",
    ],
  };

  const consequencePrompts = {
    normal: [
      "Speak in a funny accent every time you address your partner for the next two rounds.",
      "Swap an item of clothing with your partner until your next turn.",
      "Give your partner a piggyback ride around the room.",
      "Sing your partner’s favorite song out loud.",
      "Let your partner pick an embarrassing childhood story for you to share.",
    ],
    spicy: [
      "Let your partner draw a temporary tattoo on a part of your body they choose.",
      "Send your partner a flirty voice note describing how much you want them.",
      "Hold your partner’s gaze while you slowly lick your lips three times.",
      "Gently tease your partner's ear with a secret whispered fantasy.",
      "Let your partner take a photo of you in a suggestive pose.",
    ],
    extreme: [
      "Send your partner a short video reenacting their favorite intimate moment with you.",
      "Let your partner choose any piece of your clothing to remove and keep for the rest of the game.",
      "Act out a 30‑second scene from your partner’s favorite romantic movie using them as your co‑star.",
      "Describe in vivid detail what you would do to your partner if there were no consequences.",
      "Allow your partner to whisper a command for you to follow blindly.",
    ],
  };

  const triviaPrompts = [
    "What is your partner's favorite color?",
    "What is your partner's middle name?",
    "What city was your partner born in?",
    "What is your partner's favorite hobby?",
    "Which cuisine does your partner love the most?",
    "What is your partner’s biggest pet peeve?",
    "When is your partner’s birthday?",
    "What is your partner's favorite type of music?",
    "What is your partner’s dream vacation destination?",
    "What is your partner's favorite ice cream flavor?",
  ];

  // Shuffle each list so the order is different every game. Use slice to
  // ensure we return new arrays, leaving the originals intact.
  const shuffledTruth = {
    normal: shuffle([...truthPrompts.normal]),
    spicy: shuffle([...truthPrompts.spicy]),
    extreme: shuffle([...truthPrompts.extreme]),
  };
  const shuffledDare = {
    normal: shuffle([...darePrompts.normal]),
    spicy: shuffle([...darePrompts.spicy]),
    extreme: shuffle([...darePrompts.extreme]),
  };
  const shuffledConsequence = {
    normal: shuffle([...consequencePrompts.normal]),
    spicy: shuffle([...consequencePrompts.spicy]),
    extreme: shuffle([...consequencePrompts.extreme]),
  };
  const shuffledTrivia = shuffle([...triviaPrompts]);

  return {
    truth: shuffledTruth,
    dare: shuffledDare,
    consequence: shuffledConsequence,
    trivia: shuffledTrivia,
  };
}

export default generateRandomGamePrompts;