const args = process.argv.slice(2);
const name = args[0] || 'World';
const lang = args[1] || 'en';

const greetings = {
  en: `Hello, ${name}!`,
  es: `¡Hola, ${name}!`,
  fr: `Bonjour, ${name}!`,
  de: `Hallo, ${name}!`,
  jp: `こんにちは, ${name}!`,
};

const message = greetings[lang] || greetings['en'];
console.log(message);
