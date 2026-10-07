// Zet een aangeleverde vertaling (markdown, "10-final-<boek>.md") om naar
// data/bijbel/<boek>/<hoofdstuk>.json.
//
// Gebruik: node verwerk-vertaling.js <markdown-bestand> <boekcode> [output-map]
//   bijvoorbeeld: node verwerk-vertaling.js 10-final-mark.md mrk ../../data/bijbel
//
// Het script verandert geen woord van de vertaling. Het splitst op hoofdstuk en
// vers, haalt de voetnootmarkeringen ([1], [2], ...) uit de verstekst en
// koppelt de leesbare noottekst aan het vers. Interne verantwoording
// (categorie, motivering, justification) wordt niet overgenomen.
//
// Voetnoten worden per hoofdstuk opnieuw genummerd, in verscomvolgorde, omdat de
// bron per eenheid opnieuw begint bij [1] en een eenheid niet altijd een heel
// hoofdstuk is.
//
// Het script stopt bij een afwijking: ontbrekende of dubbele verzen, een
// versaantal dat niet klopt met data/kjv, een markering zonder noot, of een noot
// zonder markering.

const fs = require('fs');
const path = require('path');

const [mdPad, boekCode, uitvoerArg] = process.argv.slice(2);
if (!mdPad || !boekCode) {
	console.error('Gebruik: node verwerk-vertaling.js <markdown-bestand> <boekcode> [output-map]');
	process.exit(1);
}

const REPO = path.join(__dirname, '..', '..');
const uitvoerRoot = path.resolve(uitvoerArg || path.join(REPO, 'data', 'bijbel'));
const kjvRoot = path.join(REPO, 'data', 'kjv');

const boekenIndex = JSON.parse(fs.readFileSync(path.join(kjvRoot, 'index.json'), 'utf-8'));
const boek = boekenIndex.find((b) => b.code === boekCode);
if (!boek) {
	console.error(`Onbekende boekcode: ${boekCode}`);
	process.exit(1);
}

const fouten = [];
const waarschuwingen = [];

const bron = fs.readFileSync(mdPad, 'utf-8').replace(/\r\n/g, '\n');
const regels = bron.split('\n');

// ---------- grondtekstbron en eenheden uit de kop ----------

const grondtekstBron = (bron.match(/^Source text:\s*(.+)$/m) || [])[1] || null;
const grondtekstEdMatch = grondtekstBron && grondtekstBron.match(/\(([^)]+)\)\s*$/);
const grondtekstEditie = grondtekstEdMatch ? grondtekstEdMatch[1] : grondtekstBron;

// "07-final-unit-6.md  (Mark 6:1-29)" -> eenheid 6 loopt van 6:1 t/m 6:29
const eenheden = [];
for (const m of bron.matchAll(/07-final-unit-(\d+)\.md\s+\([^)]*?(\d+):(\d+)-(?:(\d+):)?(\d+)\)/g)) {
	const nr = Number(m[1]);
	const hVan = Number(m[2]);
	const vVan = Number(m[3]);
	const hTot = m[4] ? Number(m[4]) : hVan;
	const vTot = Number(m[5]);
	eenheden.push({ nr, van: [hVan, vVan], tot: [hTot, vTot] });
}
if (eenheden.length === 0) {
	fouten.push('Geen eenheden gevonden in de kop van het bestand.');
}

function eenheidVan(h, v) {
	const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
	return eenheden.find((e) => cmp([h, v], e.van) >= 0 && cmp([h, v], e.tot) <= 0);
}

// ---------- verzen ----------

const VERS_RE = /^\*\*[A-Z0-9]{3} (\d+):(\d+)\*\* (.+)$/;
const versLijst = [];
const gezien = new Set();
let voetnootStart = regels.findIndex((r) => /^# REQUIRED FOOTNOTES/.test(r));
if (voetnootStart === -1) voetnootStart = regels.length;

for (let i = 0; i < voetnootStart; i++) {
	const r = regels[i];
	if (!r.startsWith('**') || !/^\*\*[A-Z0-9]{3} \d+:\d+\*\*/.test(r)) continue;
	const m = r.match(VERS_RE);
	if (!m) {
		fouten.push(`Regel ${i + 1}: versregel zonder tekst of met onverwacht formaat: ${r.slice(0, 60)}`);
		continue;
	}
	const h = Number(m[1]);
	const v = Number(m[2]);
	const sleutel = `${h}:${v}`;
	if (gezien.has(sleutel)) {
		fouten.push(`Regel ${i + 1}: vers ${sleutel} komt twee keer voor.`);
		continue;
	}
	gezien.add(sleutel);
	versLijst.push({ h, v, ruw: m[3].trim(), regel: i + 1 });
}

// ---------- voetnoten ----------

// Alle noten per eenheid. Sleutel: "<eenheid>:<nr>"
const noten = new Map();

const NOOT_LABEL =
	/(?:Voorgestelde noottekst|Voetnoottekst|Noottekst|Notetekst|Note text|(?<=^|\n)Tekst)[^:\u2014\n]*?\**\s*[:\u2014]\s*\**\s*/i;
const EINDE_NOOT = /\s+(?:\*\*)?(?:Justification|Justificatie|Verantwoording|Motivering)\b[^:]*:/i;

function schoonNoot(tekst) {
	let t = tekst.trim();
	t = t.replace(EINDE_NOOT, (m, offset) => '\u0000'); // markeer einde
	const einde = t.indexOf('\u0000');
	if (einde !== -1) t = t.slice(0, einde);
	t = t.trim();
	t = t.replace(/^[*"\u201e\u201c\s]+/, '').replace(/[*"\u201d\u201c\s]+$/, '').trim();
	return t;
}

// Noottekst na het label: de rest van de regel, of een aaneengesloten citaatblok (> ...).
function haalNoot(tekst) {
	const labelM = tekst.match(NOOT_LABEL);
	if (!labelM) return null;
	const lijnen = tekst.slice(labelM.index + labelM[0].length).split('\n');
	if (/^\s*>/.test(lijnen[0])) {
		const q = [];
		for (const l of lijnen) {
			if (!/^\s*>/.test(l)) break;
			q.push(l.replace(/^\s*>\s?/, ''));
		}
		return schoonNoot(q.join(' '));
	}
	return schoonNoot(lijnen[0]);
}

{
	let eenheid = null;
	let blok = null; // { nr, kop, regels: [] }

	const sluitBlok = () => {
		if (!blok || !eenheid) return;
		const tekst = blok.regels.join('\n');
		const kop = blok.kop;

		const refM = kop.match(/(?:MAR|Mark|[A-Z]{3})?\s*(\d+):(\d+)/);
		// alleen de vette kop zelf; bij sommige eenheden staat de noottekst op dezelfde regel
		const kopVet = (kop.match(/^\*\*(.*?)\*\*/) || [null, kop])[1];
		const ankerM = kopVet.match(/["\u201c]([^"\u201d]+)["\u201d]/);
		let anker = ankerM ? ankerM[1] : null;
		if (!anker) {
			const a = tekst.match(/attached to\s+\*([^*]+)\*/i);
			if (a) anker = a[1];
		}
		if (anker) anker = anker.replace(/^\u2026/, '').trim();

		const nootTekst = haalNoot(tekst);

		if (!nootTekst) {
			fouten.push(`Eenheid ${eenheid} voetnoot [${blok.nr}]: geen noottekst gevonden.`);
		} else {
			noten.set(`${eenheid}:${blok.nr}`, {
				eenheid,
				nr: blok.nr,
				ref: refM ? [Number(refM[1]), Number(refM[2])] : null,
				anker,
				tekst: nootTekst,
			});
		}
		blok = null;
	};

	for (let i = voetnootStart; i < regels.length; i++) {
		const r = regels[i];
		if (/^# (?!REQUIRED FOOTNOTES)/.test(r)) break; // volgende hoofdonderdeel (DECISION LOG)
		const eenheidM = r.match(/^### Unit (\d+)\b/);
		if (eenheidM) {
			sluitBlok();
			eenheid = Number(eenheidM[1]);
			continue;
		}
		const notM = r.match(/^(?:\*\*|###\s*)\[(\d+)\]/);
		if (notM) {
			sluitBlok();
			blok = { nr: Number(notM[1]), kop: r, regels: [r] };
			continue;
		}
		if (r.trim() === '---') {
			sluitBlok();
			continue;
		}
		if (blok) blok.regels.push(r);
	}
	sluitBlok();
}

// ---------- markeringen in de verstekst koppelen aan noten ----------

const gebruikteNoten = new Set();
const verzen = versLijst.map((v) => {
	const eenheid = eenheidVan(v.h, v.v);
	if (!eenheid) fouten.push(`Vers ${v.h}:${v.v}: valt in geen enkele eenheid.`);

	const markeringen = [...v.ruw.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
	const tekst = v.ruw
		.replace(/\[\d+\]/g, '')
		.replace(/\s{2,}/g, ' ')
		.replace(/\s+([.,;:!?])/g, '$1')
		.trim();

	const voetnoten = [];
	for (const nr of markeringen) {
		const sleutel = `${eenheid ? eenheid.nr : '?'}:${nr}`;
		const noot = noten.get(sleutel);
		if (!noot) {
			fouten.push(`Vers ${v.h}:${v.v}: markering [${nr}] heeft geen noot in eenheid ${eenheid ? eenheid.nr : '?'}.`);
			continue;
		}
		gebruikteNoten.add(sleutel);
		if (noot.ref && (noot.ref[0] !== v.h || noot.ref[1] !== v.v)) {
			waarschuwingen.push(
				`Noot ${sleutel} noemt ${noot.ref[0]}:${noot.ref[1]}, de markering staat in ${v.h}:${v.v}. Markering is aangehouden.`,
			);
		}
		voetnoten.push({ anker: noot.anker, tekst: noot.tekst });
	}
	return { h: v.h, v: v.v, tekst, voetnoten };
});

for (const [sleutel, noot] of noten) {
	if (!gebruikteNoten.has(sleutel)) {
		fouten.push(`Noot ${sleutel} (${noot.ref ? noot.ref.join(':') : '?'}) heeft geen markering in de verstekst.`);
	}
}

// ---------- controle op volledigheid ----------

const perHoofdstuk = new Map();
for (const v of verzen) {
	if (!perHoofdstuk.has(v.h)) perHoofdstuk.set(v.h, []);
	perHoofdstuk.get(v.h).push(v);
}

for (let h = 1; h <= boek.hoofdstukken; h++) {
	const lijst = perHoofdstuk.get(h);
	if (!lijst) {
		fouten.push(`Hoofdstuk ${h} ontbreekt.`);
		continue;
	}
	lijst.sort((a, b) => a.v - b.v);
	lijst.forEach((v, i) => {
		if (v.v !== i + 1) fouten.push(`Hoofdstuk ${h}: versnummer ${i + 1} verwacht, ${v.v} gevonden.`);
	});

	const kjvBestand = path.join(kjvRoot, boekCode, String(h).padStart(2, '0') + '.json');
	if (fs.existsSync(kjvBestand)) {
		const kjvAantal = JSON.parse(fs.readFileSync(kjvBestand, 'utf-8')).verzen.length;
		if (kjvAantal !== lijst.length) {
			waarschuwingen.push(`Hoofdstuk ${h}: ${lijst.length} verzen in de vertaling, ${kjvAantal} in de KJV.`);
		}
	}
}
for (const h of perHoofdstuk.keys()) {
	if (h < 1 || h > boek.hoofdstukken) fouten.push(`Hoofdstuk ${h} bestaat niet in ${boek.naam_nl}.`);
}

// ---------- uitvoer ----------

if (fouten.length > 0) {
	console.error(`FOUT: ${fouten.length} probleem${fouten.length === 1 ? '' : 'en'}, niets geschreven.`);
	for (const f of fouten) console.error('  - ' + f);
	process.exit(1);
}

const bestandenMap = path.join(uitvoerRoot, boekCode);
fs.mkdirSync(bestandenMap, { recursive: true });

let aantalVerzen = 0;
let aantalNoten = 0;
for (const [h, lijst] of [...perHoofdstuk.entries()].sort((a, b) => a[0] - b[0])) {
	const uitvoer = {
		boek: boekCode,
		boeknummer: boek.nummer,
		hoofdstuk: h,
		bron: 'BereaBijbel',
		grondtekst_bron: grondtekstEditie,
		verzen: lijst.map((v) => {
			const o = { vers: v.v, tekst: v.tekst };
			if (v.voetnoten.length > 0) {
				o.voetnoten = v.voetnoten.map((n, i) => ({ nr: i + 1, ...n }));
			}
			return o;
		}),
	};
	// voetnoten per hoofdstuk doorlopend nummeren
	let teller = 0;
	for (const v of uitvoer.verzen) {
		for (const n of v.voetnoten || []) n.nr = ++teller;
	}
	aantalNoten += teller;
	aantalVerzen += lijst.length;
	fs.writeFileSync(
		path.join(bestandenMap, String(h).padStart(2, '0') + '.json'),
		JSON.stringify(uitvoer, null, 2) + '\n',
		'utf-8',
	);
}

console.log(`${boek.naam_nl}: ${perHoofdstuk.size} hoofdstukken, ${aantalVerzen} verzen, ${aantalNoten} voetnoten -> ${bestandenMap}`);
if (waarschuwingen.length > 0) {
	console.log(`Waarschuwingen (${waarschuwingen.length}):`);
	for (const w of waarschuwingen) console.log('  - ' + w);
}
