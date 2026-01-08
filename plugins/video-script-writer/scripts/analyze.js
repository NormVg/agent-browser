const scriptText = process.argv.slice(2).join(' ');

if (!scriptText || scriptText.length < 50) {
  console.error(JSON.stringify({ error: 'Script text too short or missing' }));
  process.exit(1);
}

// Analysis patterns
const redFlags = {
  weakOpening: /^(hey|hi|hello|welcome|in this video|today|let me)/i,
  teachingVoice: /(as you can see|let me explain|basically|essentially)/gi,
  fluff: /(kind of|sort of|basically|actually|literally)/gi,
  passive: /(will be|should be|can be seen)/gi,
};

const analysis = {
  length: {
    characters: scriptText.length,
    words: scriptText.split(/\s+/).length,
    estimatedDuration: Math.round(scriptText.split(/\s+/).length / 2.5) + 's (at 150 wpm)'
  },

  issues: [],
  strengths: [],
  score: 100
};

// Check for red flags
if (redFlags.weakOpening.test(scriptText.substring(0, 100))) {
  analysis.issues.push({
    type: 'Weak Opening',
    severity: 'high',
    problem: 'Starts with greeting or setup instead of value',
    fix: 'Start with result, bold claim, or ending'
  });
  analysis.score -= 20;
}

const teachingMatches = scriptText.match(redFlags.teachingVoice) || [];
if (teachingMatches.length > 2) {
  analysis.issues.push({
    type: 'Teaching Voice',
    severity: 'medium',
    problem: `Found ${teachingMatches.length} instances of lecturing phrases`,
    fix: 'Rewrite as "thinking out loud" - show decisions, not explanations'
  });
  analysis.score -= 15;
}

const fluffMatches = scriptText.match(redFlags.fluff) || [];
if (fluffMatches.length > 5) {
  analysis.issues.push({
    type: 'Filler Words',
    severity: 'low',
    problem: `${fluffMatches.length} filler words detected`,
    fix: 'Remove qualifiers. Be more direct and confident.'
  });
  analysis.score -= 10;
}

// Check for strengths
if (scriptText.includes('This is') && scriptText.substring(0, 200).includes('This is')) {
  analysis.strengths.push('Strong opening with direct statement');
  analysis.score += 5;
}

if (/I (built|made|created|tried|tested)/i.test(scriptText)) {
  analysis.strengths.push('Personal experience (builds trust)');
  analysis.score += 5;
}

if (/(broke|failed|mistake|wrong)/i.test(scriptText)) {
  analysis.strengths.push('Shows vulnerability (humanizes creator)');
  analysis.score += 5;
}

// Structure check
const hasHook = scriptText.length > 100;
const hasProblem = /(\?|issue|problem|broken|sucks)/i.test(scriptText);
const hasInsight = /(learned|matters|changed|real)/i.test(scriptText);

analysis.structure = {
  hasHook: hasHook,
  hasProblemStatement: hasProblem,
  hasInsight: hasInsight,
  estimatedCompleteness: Math.round(([hasHook, hasProblem, hasInsight].filter(Boolean).length / 3) * 100) + '%'
};

// Recommendations
analysis.recommendations = [
  {
    priority: 'high',
    action: analysis.issues.length > 0 ? 'Fix red flags first' : 'Script looks solid',
    details: analysis.issues.length > 0 ?
      `Focus on: ${analysis.issues.map(i => i.type).join(', ')}` :
      'Consider tightening pacing (new idea every 3-7s)'
  },
  {
    priority: 'medium',
    action: 'Add emotion',
    details: 'Decide ONE dominant emotion: curiosity, defiance, suspense, or chaos'
  },
  {
    priority: 'low',
    action: 'Test the opening',
    details: 'Can you remove the first 20% without losing meaning? If yes, cut it.'
  }
];

analysis.overallGrade =
  analysis.score >= 90 ? 'A - Ready to record' :
    analysis.score >= 75 ? 'B - Minor tweaks needed' :
      analysis.score >= 60 ? 'C - Needs revision' :
        'D - Major rewrite recommended';

console.log(JSON.stringify(analysis, null, 2));
