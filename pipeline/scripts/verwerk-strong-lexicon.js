// Zet de Strong's-woordenboeken (Grieks en Hebreeuws, e-tekst) om naar JSON voor de site.
// Bron: openscriptures/strongs, bestanden strongsgreek.dat en strongshebrew.dat (zie VERSIONS.md).
//
// Gebruik: node pipeline/scripts/verwerk-strong-lexicon.js <map met de twee .dat-bestanden>
// Uitvoer: data/lexicon/greek.json en hebrew.json
//   { "G2638": { translit, uitspraak, definitie, kjv: ["obtain", ...] }, ... }
// De tekst is Engels (Strong, 1890). Geen vertaling door een model: lexicale gegevens moeten
// verifieerbaar zijn in het woordenboek zelf (CLAUDE.md, notities).
const fs = require('fs');
const path = require('path');

const map = process.argv[2];
if (!map) {
	console.error('Gebruik: node verwerk-strong-lexicon.js <map met strongsgreek.dat en strongshebrew.dat>');
	process.exit(1);
}
const OUT = path.join(__dirname, '..', '..', 'data', 'lexicon');

// Splitst op komma's die niet tussen haakjes staan: "(fore-)father(-less), X patrimony".
function splitKomma(s) {
	const delen = [];
	let diepte = 0;
	let huidig = '';
	for (const c of s) {
		if (c === '(') diepte++;
		if (c === ')') diepte = Math.max(0, diepte - 1);
		if (c === ',' && diepte === 0) {
			delen.push(huidig);
			huidig = '';
		} else huidig += c;
	}
	delen.push(huidig);
	// Strong sluit soms af met een verwijzing ('. Compare 5590'); die hoort niet bij de weergave.
	return delen
		.map((d) => d.replace(/\.?\s*Compare .*$/, '').trim().replace(/\.$/, '').trim())
		.filter(Boolean);
}

const NUMMER_REGEL = new RegExp('^\\\\(\\d+)\\\\');
const KOP_REGEL = new RegExp('^(\\d+)\\s+(.+?)\\s{2,}(\\S.*)$');
const VERWIJZING = new RegExp('^\\s*see (GREEK|HEBREW) for \\d+');

function verwerk(bestand, voorvoegsel) {
	const tekst = fs.readFileSync(path.join(map, bestand), 'utf8').replace(/\r/g, '');
	const resultaat = {};
	for (const blok of tekst.split(/^\$\$T\d+\n/m).slice(1)) {
		const regels = blok.split('\n');
		const nummer = parseInt(NUMMER_REGEL.exec(regels[0])[1], 10);
		if (/^\d+\s+Not Used\s*$/i.test(regels[1].trim())) continue; // nummer zonder inhoud
		const kop = KOP_REGEL.exec(regels[1].trim());
		if (!kop || parseInt(kop[1], 10) !== nummer) throw new Error('onverwachte kop: ' + regels[1]);
		const body = regels
			.slice(2)
			.filter((r) => !VERWIJZING.test(r))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		const sep = body.lastIndexOf(':--');
		resultaat[voorvoegsel + nummer] = {
			translit: kop[2].trim(),
			uitspraak: kop[3].trim(),
			definitie: (sep >= 0 ? body.slice(0, sep) : body).trim(),
			kjv: sep >= 0 ? splitKomma(body.slice(sep + 3)) : [],
		};
	}
	return resultaat;
}

fs.mkdirSync(OUT, { recursive: true });
const greek = verwerk('strongsgreek.dat', 'G');
const hebrew = verwerk('strongshebrew.dat', 'H');
fs.writeFileSync(path.join(OUT, 'greek.json'), JSON.stringify(greek));
fs.writeFileSync(path.join(OUT, 'hebrew.json'), JSON.stringify(hebrew));
console.log(`Grieks: ${Object.keys(greek).length}, Hebreeuws: ${Object.keys(hebrew).length}`);
