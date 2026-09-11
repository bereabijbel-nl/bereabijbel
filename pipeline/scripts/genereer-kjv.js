const fs = require('fs');
const path = require('path');

const data = require('./KJVPCE.json');

// Boekvolgorde, code (3 tekens, per CLAUDE.md-conventie) en boeknummer (voor vers-id BBCCCVVV)
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

const OUT_DIR = path.join(__dirname, '..', '..', '..', '..', 'data', 'kjv');
// bovenstaande relatieve pad klopt niet vanuit scratchpad; output map wordt als argument meegegeven
const outputRoot = process.argv[2];
if (!outputRoot) {
	console.error('Gebruik: node genereer-kjv.js <output-map>');
	process.exit(1);
}

let totaalHoofdstukken = 0;
let totaalVerzen = 0;
const overzicht = [];

for (const boek of data.books) {
	const info = naamNaarCode.get(boek.name);
	if (!info) {
		console.error('ONBEKEND BOEK, script stopt:', boek.name);
		process.exit(1);
	}
	const boekDir = path.join(outputRoot, info.code);
	fs.mkdirSync(boekDir, { recursive: true });

	for (const hst of boek.chapters) {
		const hstNummer = String(hst.chapter).padStart(2, '0');
		const verzen = hst.verses.map((v) => ({
			vers: v.verse,
			tekst: v.text.replace(/¶\s*/g, '').trim(),
		}));

		const uitvoer = {
			boek: info.code,
			boeknummer: info.nummer,
			hoofdstuk: hst.chapter,
			bron: 'KJVPCE',
			verzen,
		};

		fs.writeFileSync(
			path.join(boekDir, `${hstNummer}.json`),
			JSON.stringify(uitvoer, null, 2) + '\n',
			'utf-8'
		);

		totaalHoofdstukken += 1;
		totaalVerzen += verzen.length;
	}

	overzicht.push(`${info.code} (${boek.name}): ${boek.chapters.length} hoofdstukken`);
}

console.log(`Klaar. ${BOEKEN.length} boeken, ${totaalHoofdstukken} hoofdstukken, ${totaalVerzen} verzen.`);
console.log('Uitvoer:', outputRoot);
