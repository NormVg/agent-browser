const args = process.argv.slice(2);
const transformType = args.pop() || 'lower';
const text = args.join(' ');

if (!text) {
  console.error(JSON.stringify({ error: 'No text provided' }));
  process.exit(1);
}

let result;

switch (transformType) {
  case 'upper':
    result = text.toUpperCase();
    break;
  case 'lower':
    result = text.toLowerCase();
    break;
  case 'title':
    result = text.replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    break;
  case 'reverse':
    result = text.split('').reverse().join('');
    break;
  default:
    console.error(JSON.stringify({ error: `Unknown transformation: ${transformType}` }));
    process.exit(1);
}

console.log(JSON.stringify({
  original: text,
  transformation: transformType,
  result: result
}, null, 2));
