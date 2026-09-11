// Verwerkt de Elzevir TR "parsed" ASCII-bestanden (byztxt/greektext-elzevir) naar
// data/grondtekst/nt/<boek>/<hoofdstuk>.json met Unicode Grieks + Strong-nummer + morfologie.
//
// Codering geverifieerd tegen Johannes 1:1 (vergeleken met de Unicode-versie van
// byztxt/byzantine-majority-text): standaard Beta Code-letters, accent/ademing weggelaten.
const fs = require('fs');
const path = require('path');

const LETTER_MAP = {
	a: 'α', b: 'β', c: 'χ', d: 'δ', e: 'ε', f: 'φ', g: 'γ', h: 'η', i: 'ι',
	k: 'κ', l: 'λ', m: 'μ', n: 'ν', o: 'ο', p: 'π', q: 'θ', r: 'ρ', s: 'σ',
	t: 'τ', u: 'υ', v: 'ς', w: 'ω', x: 'ξ', y: 'ψ', z: 'ζ',
};

function naarGrieks(ascii) {
	return ascii
		.toLowerCase()
		.split('')
		.map((ch) => LETTER_MAP[ch] ?? ch)
		.join('');
}

// Boekcode (CLAUDE.md-conventie) + bestandsnaam in de bron + boeknummer (voor vers-id)
const NT_BOEKEN = [
	['mat', 'MT.UEL', 40], ['mrk', 'MR.UEL', 41], ['luk', 'LU.UEL', 42], ['joh', 'JOH.UEL', 43],
	['act', 'AC.UEL', 44], ['rom', 'RO.UEL', 45], ['1co', '1CO.UEL', 46], ['2co', '2CO.UEL', 47],
	['gal', 'GA.UEL', 48], ['eph', 'EPH.UEL', 49], ['php', 'PHP.UEL', 50], ['col', 'COL.UEL', 51],
	['1th', '1TH.UEL', 52], ['2th', '2TH.UEL', 53], ['1ti', '1TI.UEL', 54], ['2ti', '2TI.UEL', 55],
	['tit', 'TIT.UEL', 56], ['phm', 'PHM.UEL', 57], ['heb', 'HEB.UEL', 58], ['jas', 'JAS.UEL', 59],
	['1pe', '1PE.UEL', 60], ['2pe', '2PE.UEL', 61], ['1jo', '1JO.UEL', 62], ['2jo', '2JO.UEL', 63],
	['3jo', '3JO.UEL', 64], ['jud', 'JUDE.UEL', 65], ['rev', 'RE.UEL', 66],
];

const bronDir = process.argv[2];
const outDir = process.argv[3];

let totaalHoofdstukken = 0;
let totaalVerzen = 0;
let totaalWoorden = 0;

for (const [code, bestand, boeknummer] of NT_BOEKEN) {
	const tekst = fs.readFileSync(path.join(bronDir, bestand), 'utf-8');
	// Elk vers begint met "H:V " aan het begin van een logische regel; regels lopen
	// door tot de volgende "H:V "-marker. We voegen eerst alles samen en splitsen dan.
	const eenRegel = tekst.replace(/\r\n/g, '\n').replace(/\n(?!\d+:\d+ )/g, ' ');
	const regels = eenRegel.split('\n').filter((r) => r.trim());

	const hoofdstukken = {};
	for (const regel of regels) {
		const m = regel.match(/^(\d+):(\d+)\s+(.*)$/);
		if (!m) continue;
		const [, hRaw, vRaw, rest] = m;
		const h = parseInt(hRaw, 10);
		const v = parseInt(vRaw, 10);

		// Tokens: woord getal [getal] {MORF}
		const tokenRegex = /(\S+)\s+(\d+)(?:\s+(\d+))?\s+\{([^}]+)\}/g;
		const woorden = [];
		let mm;
		while ((mm = tokenRegex.exec(rest)) !== null) {
			const [, asciiWoord, strongNum, , morf] = mm;
			woorden.push({
				tekst: naarGrieks(asciiWoord.replace(/[^a-zA-Z]/g, '')),
				strong: 'G' + strongNum,
				morf: morf.trim(),
			});
		}
		if (!woorden.length) continue;

		if (!hoofdstukken[h]) hoofdstukken[h] = {};
		hoofdstukken[h][v] = woorden;
		totaalWoorden += woorden.length;
	}

	const boekDir = path.join(outDir, code);
	fs.mkdirSync(boekDir, { recursive: true });

	for (const [hStr, versen] of Object.entries(hoofdstukken)) {
		const h = parseInt(hStr, 10);
		const versArray = Object.entries(versen)
			.map(([vStr, woorden]) => ({ vers: parseInt(vStr, 10), woorden }))
			.sort((a, b) => a.vers - b.vers);

		fs.writeFileSync(
			path.join(boekDir, String(h).padStart(2, '0') + '.json'),
			JSON.stringify({ boek: code, boeknummer, hoofdstuk: h, bron: 'Elzevir TR (byztxt)', verzen: versArray }, null, 2) + '\n',
			'utf-8',
		);
		totaalHoofdstukken += 1;
		totaalVerzen += versArray.length;
	}
	console.log(code, ': ', Object.keys(hoofdstukken).length, 'hoofdstukken verwerkt');
}

console.log('\nTotaal:', totaalHoofdstukken, 'hoofdstukken,', totaalVerzen, 'verzen,', totaalWoorden, 'woorden.');
