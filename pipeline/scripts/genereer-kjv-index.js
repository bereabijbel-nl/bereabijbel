const fs = require('fs');
const path = require('path');
const data = require('./KJVPCE.json');

const BOEKEN = [
	['Genesis', 'gen'], ['Exodus', 'exo'], ['Leviticus', 'lev'], ['Numbers', 'num'],
	['Deuteronomy', 'deu'], ['Joshua', 'jos'], ['Judges', 'jdg'], ['Ruth', 'rut'],
	['I Samuel', '1sa'], ['II Samuel', '2sa'], ['I Kings', '1ki'], ['II Kings', '2ki'],
	['I Chronicles', '1ch'], ['II Chronicles', '2ch'], ['Ezra', 'ezr'], ['Nehemiah', 'neh'],
	['Esther', 'est'], ['Job', 'job'], ['Psalms', 'psa'], ['Proverbs', 'pro'],
	['Ecclesiastes', 'ecc'], ['Song of Solomon', 'sng'], ['Isaiah', 'isa'], ['Jeremiah', 'jer'],
	['Lamentations', 'lam'], ['Ezekiel', 'eze'], ['Daniel', 'dan'], ['Hosea', 'hos'],
	['Joel', 'joe'], ['Amos', 'amo'], ['Obadiah', 'oba'], ['Jonah', 'jon'],
	['Micah', 'mic'], ['Nahum', 'nah'], ['Habakkuk', 'hab'], ['Zephaniah', 'zep'],
	['Haggai', 'hag'], ['Zechariah', 'zec'], ['Malachi', 'mal'], ['Matthew', 'mat'],
	['Mark', 'mrk'], ['Luke', 'luk'], ['John', 'joh'], ['Acts', 'act'],
	['Romans', 'rom'], ['I Corinthians', '1co'], ['II Corinthians', '2co'], ['Galatians', 'gal'],
	['Ephesians', 'eph'], ['Philippians', 'php'], ['Colossians', 'col'], ['I Thessalonians', '1th'],
	['II Thessalonians', '2th'], ['I Timothy', '1ti'], ['II Timothy', '2ti'], ['Titus', 'tit'],
	['Philemon', 'phm'], ['Hebrews', 'heb'], ['James', 'jas'], ['I Peter', '1pe'],
	['II Peter', '2pe'], ['I John', '1jo'], ['II John', '2jo'], ['III John', '3jo'],
	['Jude', 'jud'], ['Revelation of John', 'rev'],
];

const naamNaarCode = new Map(BOEKEN.map(([naam, code], i) => [naam, { code, nummer: i + 1 }]));

const index = data.books.map((boek) => {
	const info = naamNaarCode.get(boek.name);
	return {
		code: info.code,
		nummer: info.nummer,
		naam_en: boek.name,
		testament: info.nummer <= 39 ? 'ot' : 'nt',
		hoofdstukken: boek.chapters.length,
	};
});

const outputRoot = process.argv[2];
fs.writeFileSync(path.join(outputRoot, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf-8');
console.log('index.json geschreven met', index.length, 'boeken');
