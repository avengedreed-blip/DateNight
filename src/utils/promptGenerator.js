const DEFAULT_COUNTS = {
  truthPrompts: { normal: 12, spicy: 12, extreme: 10 },
  darePrompts: { normal: 12, spicy: 12, extreme: 10 },
  triviaQuestions: { normal: 12 },
  consequences: { normal: 8, spicy: 8, extreme: 8 },
};

const truthNormalPool = [
  "Share the story of a small gesture your partner did recently that meant more than they know.",
  "Describe a time your partner surprised you with their support when you really needed it.",
  "What is a simple daily routine the two of you share that you secretly cherish?",
  "Tell your partner about a dream or goal of theirs that inspires you and why.",
  "Explain the first impression you had of your partner and how it changed over time.",
  "Reveal one way your partner makes you feel safe or grounded during stressful days.",
  "What personal growth have you noticed in yourself since being with your partner?",
  "Share a moment from this past year that reminded you why you chose your partner.",
  "Describe a favorite memory from a quiet night in together and why it stands out.",
  "Tell your partner about a habit of theirs that always makes you smile.",
  "What new tradition would you love to start together this year and why?",
  "Describe a moment when you saw your partner through someone else's eyes and felt proud.",
  "Explain one way your partner communicates love without words that really lands with you.",
  "Share a challenge you overcame together and what it taught you about your relationship.",
  "Tell your partner about something they did that you bragged about to someone else.",
  "Describe a way your partner comforts you that no one else can replicate.",
  "What song, smell, or taste instantly transports you to a memory with your partner?",
  "Share a goal you and your partner achieved together and how it strengthened your bond.",
];

const truthSpicyPool = [
  "Describe in detail the foreplay move from your partner that never fails to light you up.",
  "Confess a time your partner turned you on in public and how you handled it.",
  "Reveal a new place in the house you'd secretly love to fool around with your partner.",
  "Tell your partner exactly how you want them to undress you the next time you hook up.",
  "Describe your favorite way your partner teases you when they know you're already worked up.",
  "Share a fantasy that stars your partner and a specific outfit or role.",
  "Explain how you like your partner to initiate when you're craving them badly.",
  "Tell your partner something you've imagined them whispering in your ear during sex.",
  "Describe the kind of aftercare from your partner that leaves you floating.",
  "Confess the last time you couldn't stop thinking about touching your partner and what you pictured.",
  "Share the boldest compliment your partner could give you in bed to drive you wild.",
  "Explain exactly how your partner should use their hands on you when you're desperate for them.",
  "Tell your partner what pace and pressure you crave when they go down on you.",
  "Describe the look from your partner that makes you instantly ready to misbehave.",
  "Confess the last spicy message you wanted to send your partner but didn't.",
];

const truthExtremePool = [
  "Lay out a full fantasy involving your partner, a toy you've been curious about, and how you'd use it together.",
  "Describe in graphic detail the most intense orgasm your partner has ever given you.",
  "Confess a boundary you are genuinely considering bending for your partner tonight and why.",
  "Explain the riskiest place you'd actually be willing to have sex with your partner right now.",
  "Describe how you'd want your partner to dominate you if you surrendered total control.",
  "Tell your partner a craving you have for them that still scares you a little.",
  "Reveal the most taboo roleplay you want to try with your partner and how you'd set the scene.",
  "Share an explicit detail about your partner's body that you think about when you touch yourself.",
  "Describe how you'd orchestrate an extended tease session for your partner with no orgasms allowed.",
  "Confess the wildest thing you'd let your partner record between you two if you knew it stayed private.",
  "Explain the moment you seriously considered inviting a third person in and what stopped you.",
];

const dareNormalPool = [
  "Give your partner a slow, heartfelt forehead kiss and tell them why you love them.",
  "Take a minute to massage your partner's hands and talk about your day while you do it.",
  "Write a quick flirty text to your partner and send it right now, even though they're across from you.",
  "Share a grateful affirmation about your relationship while holding your partner's hands.",
  "Take a selfie together acting out your favorite inside joke.",
  "Do a two-minute back stretch routine while your partner mirrors you.",
  "Swap seats and describe your partner as if introducing them to a crowd of admirers.",
  "Spend one minute complimenting your partner without repeating yourself.",
  "Hum your partner's favorite song while slow dancing together for one minute.",
  "Let your partner choose a snack and you have to present it like a fancy tasting.",
  "Act out the moment you first met using only facial expressions and gestures.",
  "Share an encouraging pep talk with your partner about something they're working on.",
  "Hold eye contact with your partner for 45 seconds, then describe what you noticed.",
];

const dareSpicyPool = [
  "Trace your partner's lips with your finger before kissing them deeply for 20 seconds.",
  "Blindfold yourself and let your partner place your hands where they want to be touched.",
  "Kiss from your partner's neck down to their waistband without breaking contact.",
  "Sit on your partner's lap facing them and whisper three dirty compliments in their ear.",
  "Let your partner choose a part of your body to kiss for a full 30 seconds without stopping.",
  "Use your partner's hands to guide your body exactly where they want it for one minute.",
  "Describe, while demonstrating, how you want your partner to touch you later tonight.",
  "Take off one piece of clothing as slowly as you can while describing what you want next.",
  "Give your partner a lingering kiss while your hands explore under their shirt.",
  "Guide your partner's hand to a sensitive spot and tell them the pressure you crave.",
  "Kiss your partner's inner thigh while maintaining eye contact.",
  "Let your partner choose a song and grind on them to the beat for 30 seconds.",
  "Hold your partner's wrists above their head and whisper exactly what you'll do after the game.",
];

const dareExtremePool = [
  "Give your partner oral sex for two minutes without letting them climax.",
  "Let your partner tie your hands while they kiss and touch you wherever they want for three minutes.",
  "Get completely nude and offer yourself to your partner for their chosen fantasy for five minutes.",
  "Use your dirtiest voice to describe how you'll make your partner climax twice tonight—and then do the first half now.",
  "Straddle your partner and grind on them until both of you are breathless.",
  "Let your partner blindfold you and explore you with a toy of their choice for three minutes.",
  "Edge yourself in front of your partner for two minutes while they watch closely.",
  "Take explicit photos of each other that only the two of you get to keep.",
  "Let your partner spank you exactly how they want ten times while you count out loud.",
  "Perform your partner's favorite sex act on them until they beg you to stop.",
  "Tie your partner to a chair and arouse them until they are desperate, then leave them there for the next round.",
];

const triviaNormalPool = [
  "What city was your partner born in?",
  "What is your partner's middle name?",
  "What meal does your partner ask for when they want comfort food?",
  "Which song is guaranteed to get your partner singing along?",
  "What was the exact location of your first kiss together?",
  "What color are your partner's eyes?",
  "What is your partner's go-to coffee or tea order?",
  "What is the name of your partner's childhood best friend?",
  "What was your partner wearing the first time you met?",
  "Which holiday tradition matters most to your partner?",
  "What time of day is your partner naturally most energetic?",
  "What is your partner's favorite way to spend a lazy Sunday?",
  "Which movie can your partner quote word for word?",
  "What is the brand or scent of your partner's everyday fragrance?",
  "What is your partner's phone background right now?",
  "Which relative does your partner call most often?",
  "What is the next trip destination your partner has been daydreaming about?",
  "Which board or video game brings out your partner's competitive side?",
  "What was the first concert your partner ever attended?",
  "What snack does your partner always keep stocked at home?",
];

const consequenceNormalPool = [
  "Fetch your partner their favorite drink and serve it with a flourish.",
  "You must narrate the next two rounds in an overly dramatic voice.",
  "Offer your partner a five-minute shoulder and neck massage.",
  "Swap seats with your partner and stay there for the next three rounds.",
  "You have to say something you appreciate about your partner before each turn for the rest of the game.",
  "Let your partner post a sweet compliment about you on social media right now.",
  "Give your partner full control of the music for the next 20 minutes and hype every song they pick.",
  "Wear an accessory your partner chooses for the next four rounds.",
  "Speak with an over-the-top accent for the next two rounds at your partner's command.",
];

const consequenceSpicyPool = [
  "Let your partner choose one article of clothing you must remove immediately.",
  "Every time you refuse or answer incorrectly for the next three rounds, you owe your partner a 15-second make-out session.",
  "You must sit pressed against your partner for the next five rounds—no space allowed.",
  "Send your partner a brand-new thirst trap photo before the game ends tonight.",
  "Allow your partner to write a spicy message on your body and leave it there for three rounds.",
  "Give your partner a heated whisper describing what you'll do to them after the game, and you must follow through.",
  "Let your partner pick a toy or prop you'll need to keep near you until the game is over.",
  "You owe your partner a steamy shower invitation immediately after the game wraps.",
];

const consequenceExtremePool = [
  "Submit to your partner and let them orchestrate a full scene of their choosing tonight—no complaints allowed.",
  "Strip completely and remain naked for the next fifteen minutes.",
  "Hand your partner your phone so they can record a private explicit video together right now.",
  "Allow your partner to tie you up and use any toy they want on you for five uninterrupted minutes.",
  "Let your partner demand two orgasms from you before you get to sleep tonight.",
  "Wear a plug or other toy of your partner's choosing until the next morning.",
  "Give your partner permission to share one explicit fantasy of yours with a trusted friend of theirs.",
  "You must beg your partner to let you climax after they edge you for five minutes right now.",
];

const pools = {
  truthPrompts: {
    normal: truthNormalPool,
    spicy: truthSpicyPool,
    extreme: truthExtremePool,
  },
  darePrompts: {
    normal: dareNormalPool,
    spicy: dareSpicyPool,
    extreme: dareExtremePool,
  },
  triviaQuestions: {
    normal: triviaNormalPool,
  },
  consequences: {
    normal: consequenceNormalPool,
    spicy: consequenceSpicyPool,
    extreme: consequenceExtremePool,
  },
};

const shuffle = (items, rng) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const sample = (items, count, rng) => shuffle(items, rng).slice(0, count);

export const generatePromptSet = (rng = Math.random) => {
  const result = {};

  Object.entries(pools).forEach(([category, groups]) => {
    result[category] = {};
    Object.entries(groups).forEach(([groupName, options]) => {
      const count = DEFAULT_COUNTS?.[category]?.[groupName] ?? options.length;
      const selection = sample(options, Math.min(count, options.length), rng);
      result[category][groupName] = selection;
    });
  });

  return result;
};

export const buildPromptGroups = (source) => ({
  truth: source?.truthPrompts?.normal ?? [],
  spicyTruth: source?.truthPrompts?.spicy ?? [],
  truthExtreme: source?.truthPrompts?.extreme ?? [],
  dare: source?.darePrompts?.normal ?? [],
  spicyDare: source?.darePrompts?.spicy ?? [],
  dareExtreme: source?.darePrompts?.extreme ?? [],
  trivia: source?.triviaQuestions?.normal ?? [],
  consequenceNormal: source?.consequences?.normal ?? [],
  consequenceSpicy: source?.consequences?.spicy ?? [],
  consequenceExtreme: source?.consequences?.extreme ?? [],
});
