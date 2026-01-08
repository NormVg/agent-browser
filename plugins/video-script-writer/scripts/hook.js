const topic = process.argv[2];
const style = process.argv[3] || 'result';

if (!topic) {
  console.error(JSON.stringify({ error: 'No topic provided' }));
  process.exit(1);
}

const hookTemplates = {
  result: [
    `I built [concrete result about ${topic}]`,
    `This is a new [thing related to ${topic}]`,
    `I created [specific achievement with ${topic}]`,
    `Here's [end result] using ${topic}`,
    `I made [something] that [does X with ${topic}]`
  ],

  bold: [
    `${topic} is broken. Here's why.`,
    `Everyone does ${topic} wrong`,
    `The truth about ${topic} that nobody tells you`,
    `Why ${topic} doesn't work (and what does)`,
    `${topic} is a lie. This is better.`
  ],

  reveal: [
    `For 30 days, I [action with ${topic}]`,
    `I tried ${topic}. This happened.`,
    `What happens when you [extreme action with ${topic}]`,
    `I tested ${topic} so you don't have to`,
    `I broke ${topic}. Here's what I learned.`
  ],

  question: [
    `Why does ${topic} suck?`,
    `What if ${topic} actually [opposite of expected]?`,
    `Can you really [bold claim about ${topic}]?`,
    `Is ${topic} worth it? (Spoiler: [yes/no])`,
    `What's wrong with ${topic}?`
  ]
};

const hooks = hookTemplates[style] || hookTemplates.result;

const output = {
  topic: topic,
  style: style,
  hooks: hooks.map((template, i) => ({
    id: i + 1,
    text: template,
    duration: '3-10s',
    goal: style === 'result' ? 'Show payoff immediately' :
      style === 'bold' ? 'State controversial opinion' :
        style === 'reveal' ? 'Tease the journey' : 'Create curiosity gap'
  })),

  bestPractices: [
    'NO greetings or "Hey guys"',
    'NO "In this video I will..."',
    'Start with VALUE, not context',
    'Choose the hook that sounds most natural to YOUR voice',
    'Test: Would YOU click it?'
  ],

  nextSteps: [
    'Pick 1-2 hooks',
    'Record them both',
    'A/B test which performs better',
    'Iterate on the winner'
  ]
};

console.log(JSON.stringify(output, null, 2));
