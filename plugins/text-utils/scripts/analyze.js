const text = process.argv.slice(2).join(' ');

if (!text) {
  console.error(JSON.stringify({ error: 'No text provided' }));
  process.exit(1);
}

const words = text.trim().split(/\s+/);
const lines = text.split('\n');
const chars = text.length;
const charsNoSpaces = text.replace(/\s/g, '').length;

const analysis = {
  text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
  stats: {
    characters: chars,
    charactersNoSpaces: charsNoSpaces,
    words: words.length,
    lines: lines.length,
    avgWordLength: (charsNoSpaces / words.length).toFixed(2),
  }
};

console.log(JSON.stringify(analysis, null, 2));
