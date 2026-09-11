// Verwerkt de WLC OSIS-XML-bestanden naar data/grondtekst/ot/<boek>/<hoofdstuk>.json,
// met versnummers omgezet naar de Engelse/KJV-indeling via de officiële VerseMap.xml
// (openscriptures/morphhb), zodat hoofdstuk/vers exact aansluit bij data/kjv/.
const fs = require('fs');
const path = require('path');

const OT_BOEKEN = [
	['gen', 'Gen', 1], ['exo', 'Exod', 2], ['lev', 'Lev', 3], ['num', 'Num', 4],
	['deu', 'Deut', 5], ['jos', 'Josh', 6], ['jdg', 'Judg', 7], ['rut', 'Ruth', 8],
	['1sa', '1Sam', 9], ['2sa', '2Sam', 10], ['1ki', '1Kgs', 11], ['2ki', '2Kgs', 12],
	['1ch', '1Chr', 13], ['2ch', '2Chr', 14], ['ezr', 'Ezra', 15], ['neh', 'Neh', 16],
	['est', 'Esth', 17], ['job', 'Job', 18], ['psa', 'Ps', 19], ['pro', 'Prov', 20],
	['ecc', 'Eccl', 21], ['sng', 'Song', 22], ['isa', 'Isa', 23], ['jer', 'Jer', 24],
	['lam', 'Lam', 25], ['eze', 'Ezek', 26], ['dan', 'Dan', 27], ['hos', 'Hos', 28],
	['joe', 'Joel', 29], ['amo', 'Amos', 30], ['oba', 'Obad', 31], ['jon', 'Jonah', 32],
	['mic', 'Mic', 33], ['nah', 'Nah', 34], ['hab', 'Hab', 35], ['zep', 'Zeph', 36],
	['hag', 'Hag', 37], ['zec', 'Zech', 38], ['mal', 'Mal', 39],
];

function strongVan(lemma) {
	if (!lemma) return null;
	const laatsteSegment = lemma.split('/').pop().trim();
	const m = laatsteSegment.match(/^(\d+)/);
	return m ? 'H' + m[1] : null;
}

function laadVerseMap(bestandspad) {
	const xml = fs.readFileSync(bestandspad, 'utf-8');
	const perBoek = {}; // osisID -> Map("C.V" -> "C.V")
	const boekRegex = /<book osisID="([^"]+)">([\s\S]*?)<\/book>/g;
	let bm;
	while ((bm = boekRegex.exec(xml)) !== null) {
		const [, osisID, inhoud] = bm;
		const map = new Map();
		const verseRegex = /<verse wlc="[^.]+\.(\d+)\.(\d+)(?:!a|!b)?" kjv="[^.]+\.(\d+)\.(\d+)(?:!a|!b)?"/g;
		let vm;
		while ((vm = verseRegex.exec(inhoud)) !== null) {
			const [, wh, wv, kh, kv] = vm;
			map.set(wh + '.' + wv, kh + '.' + kv);
		}
		perBoek[osisID] = map;
	}
	return perBoek;
}

const bronDir = process.argv[2];
const outDir = process.argv[3];
const verseMapPad = process.argv[4];

const verseMap = laadVerseMap(verseMapPad);

let totaalHoofdstukken = 0;
let totaalVerzen = 0;
let totaalWoorden = 0;
let aantalGeremapt = 0;

for (const [code, osisID, boeknummer] of OT_BOEKEN) {
	const xml = fs.readFileSync(path.join(bronDir, osisID + '.xml'), 'utf-8');
	const boekMap = verseMap[osisID] || new Map();

	const verseRegex = /<verse osisID="[^.]+\.(\d+)\.(\d+)">([\s\S]*?)<\/verse>/g;
	const hoofdstukken = {};
	let vm;
	while ((vm = verseRegex.exec(xml)) !== null) {
		let h = parseInt(vm[1], 10);
		let v = parseInt(vm[2], 10);
		const inhoud = vm[3];

		const sleutel = h + '.' + v;
		if (boekMap.has(sleutel)) {
			const [kh, kv] = boekMap.get(sleutel).split('.').map(Number);
			h = kh;
			v = kv;
			aantalGeremapt += 1;
		}

		const wRegex = /<w lemma="([^"]+)"[^>]*>([^<]+)<\/w>/g;
		const woorden = [];
		let wm;
		while ((wm = wRegex.exec(inhoud)) !== null) {
			const strong = strongVan(wm[1]);
			if (!strong) continue;
			woorden.push({ tekst: wm[2].trim(), strong, morf: null });
		}
		if (!woorden.length) continue;

		if (!hoofdstukken[h]) hoofdstukken[h] = {};
		// Bij samenvoeging (zeldzaam, "partial"-gevallen) woorden toevoegen i.p.v. overschrijven
		if (hoofdstukken[h][v]) {
			hoofdstukken[h][v] = hoofdstukken[h][v].concat(woorden);
		} else {
			hoofdstukken[h][v] = woorden;
		}
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
			JSON.stringify(
				{ boek: code, boeknummer, hoofdstuk: h, bron: 'WLC (openscriptures/morphhb), vers-genummerd volgens Engelse/KJV-indeling', verzen: versArray },
				null,
				2,
			) + '\n',
			'utf-8',
		);
		totaalHoofdstukken += 1;
		totaalVerzen += versArray.length;
	}
	console.log(code, ': ', Object.keys(hoofdstukken).length, 'hoofdstukken verwerkt');
}

console.log('\nTotaal:', totaalHoofdstukken, 'hoofdstukken,', totaalVerzen, 'verzen,', totaalWoorden, 'woorden.');
console.log('Aantal verzen geremapt naar KJV-nummering:', aantalGeremapt);
