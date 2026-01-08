const topic = process.argv[2];
const videoType = process.argv[3] || 'build';
const targetLength = parseInt(process.argv[4]) || 180;

if (!topic) {
  console.error(JSON.stringify({ error: 'No topic provided' }));
  process.exit(1);
}

// Emotion mapping
const emotions = {
  tutorial: 'Relief + trust',
  experiment: 'Suspense',
  rant: 'Controlled chaos',
  build: 'Curiosity + competence',
  satire: 'Controlled chaos'
};

// Time allocations based on length
const timings = {
  30: { hook: 3, problem: 5, journey: 12, insight: 5, payoff: 3, invite: 2 },
  60: { hook: 5, problem: 10, journey: 25, insight: 10, payoff: 7, invite: 3 },
  180: { hook: 10, problem: 30, journey: 80, insight: 30, payoff: 20, invite: 10 },
  300: { hook: 15, problem: 45, journey: 130, insight: 50, payoff: 40, invite: 20 }
};

const closest = Object.keys(timings).reduce((prev, curr) =>
  Math.abs(curr - targetLength) < Math.abs(prev - targetLength) ? curr : prev
);

const timing = timings[closest];

const script = {
  metadata: {
    topic: topic,
    videoType: videoType,
    dominantEmotion: emotions[videoType] || 'Curiosity',
    targetLength: targetLength + 's',
    structure: 'Act 1-5 Framework'
  },

  outline: {
    act1_hook: {
      duration: timing.hook + 's',
      goal: 'Show result or bold claim immediately',
      suggestions: [
        `"I built [result related to ${topic}]"`,
        `"This is [unexpected thing about ${topic}]"`,
        `"For ${targetLength}s, I [action related to ${topic}]"`
      ],
      rules: [
        'NO greetings',
        'NO context setting',
        'Show payoff upfront'
      ]
    },

    act2_tension: {
      duration: timing.problem + 's',
      goal: 'Why this shouldn\'t exist / what\'s broken',
      suggestions: [
        `"The current way of [topic] is broken because..."`,
        `"Everyone does [topic] like this. It's stupid."`,
        `"I hate how [aspect of topic] works"`
      ],
      rules: [
        'Attack your own idea',
        'Build trust through honesty',
        'Use sarcasm or exaggeration'
      ]
    },

    act3_journey: {
      duration: timing.journey + 's',
      goal: 'Narrate thinking, not typing',
      structure: [
        'Decision: "I decided to try X instead"',
        'Obstacle 1: "This part broke everything"',
        'Tradeoff: "I could do X or Y, chose X because..."',
        'Mistake: "This looked easy. It wasn\'t."'
      ],
      rules: [
        'Decisions > explanations',
        'Tradeoffs > perfection',
        'Show the mess confidently'
      ]
    },

    act4_insight: {
      duration: timing.insight + 's',
      goal: 'Make viewer smarter',
      deliverables: [
        'A mental model',
        'A rule of thumb',
        'A hard-earned lesson'
      ],
      phrases: [
        '"Here\'s what actually matters"',
        '"This changed how I think about [topic]"',
        '"The real problem wasn\'t X, it was Y"'
      ]
    },

    act5_payoff: {
      duration: timing.payoff + 's',
      goal: 'Show it working OR show failure honestly',
      options: [
        'Demo the result',
        'Reveal the conclusion',
        'Admit the failure with the lesson'
      ]
    },

    invite: {
      duration: timing.invite + 's',
      tone: 'Invitation, not push',
      suggestions: [
        '"Try it"',
        '"If this resonated, you\'re my kind of person"',
        '"Download it / join Discord / watch next"'
      ]
    }
  },

  writingRules: {
    voice: 'Think out loud, not lecture',
    avoid: ['As you can see', 'Let me explain', 'In today\'s video'],
    use: ['So obviously this breaks', 'This is where it gets weird', 'I thought this would work'],
    pacing: 'New visual/idea every 3-7 seconds',
    compression: 'If you can\'t explain in 1 sentence, it\'s not ready',
    humor: 'Build systems that allow jokes (don\'t decorate with jokes)'
  },

  persona: {
    balance: {
      confidence: 'I built this',
      humility: 'This part is dumb',
      authority: 'Clear opinions',
      humanity: 'Admitting mistakes'
    },
    edge: 'Taste + honesty',
    principle: 'Think in public, not teach'
  }
};

console.log(JSON.stringify(script, null, 2));
