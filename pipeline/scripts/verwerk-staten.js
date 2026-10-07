// Zet de CrossWire SWORD-module DutSVV (Statenvertaling, publiek domein) om naar JSON per hoofdstuk.
// Alleen voor weergave naast de BereaBijbel op de site. De Statenvertaling blijft buiten de
// vertaalprompts (CLAUDE.md, absolute regel 1).
//
// Gebruik: node pipeline/scripts/verwerk-staten.js <DutSVV.zip of de uitgepakte map>
// Uitvoer: data/staten/<boek>/<hoofdstuk>.json  { boek, hoofdstuk, bron, verzen: [{ vers, tekst }] }
const fs = require('fs');
const path = require('path');
const { maakLezer, laadItems } = require('./sword');

const bron = process.argv[2];
if (!bron) {
	console.error('Gebruik: node verwerk-staten.js <DutSVV.zip of map>');
	process.exit(1);
}
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'staten');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'kjv', 'index.json'), 'utf8'));

// OSIS-boekid -> onze boekcode, in dezelfde volgorde als index.json (Bijbelvolgorde).
const OSIS = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'];
const codeVanOsis = new Map(OSIS.map((o, i) => [o, index[i].code]));

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
function tekstVan(osis) {
	let uit = '';
	let inNoot = 0;
	for (const m of osis.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g)) {
		const [, sluit, tag, , zelfsluitend, tekst] = m;
		if (tekst !== undefined) {
			if (!inNoot) uit += tekst.replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTITIES[e]);
		} else if (tag === 'note' && !zelfsluitend) inNoot += sluit ? -1 : 1;
	}
	return uit.replace(/\s+/g, ' ').trim();
}

const lees = maakLezer(bron);
const hoofdstukken = new Map(); // "code/nn" -> [{vers, tekst}]
for (const t of ['ot', 'nt']) {
	let code = null;
	let hoofdstuk = null;
	let vers = 0;
	for (const item of laadItems(lees, 'modules/texts/ztext/dutsvv/' + t)) {
		const boekKop = /<div[^>]*type="book"[^>]*>/.exec(item);
		const hstKop = /<chapter\b[^>]*osisID="([^"]+)"[^>]*sID/.exec(item);
		if (boekKop && /\ssID=/.test(boekKop[0])) {
			code = codeVanOsis.get(/osisID="([^"]+)"/.exec(boekKop[0])[1]) ?? null; // apocrief: null
			hoofdstuk = null;
		}
		if (hstKop) {
			hoofdstuk = parseInt(hstKop[1].split('.')[1], 10);
			vers = 0;
			continue;
		}
		if (!code || hoofdstuk === null) continue;
		vers++;
		const tekst = tekstVan(item);
		if (!tekst) continue;
		const sleutel = `${code}/${String(hoofdstuk).padStart(2, '0')}`;
		if (!hoofdstukken.has(sleutel)) hoofdstukken.set(sleutel, []);
		hoofdstukken.get(sleutel).push({ vers, tekst });
	}
}

let geschreven = 0;
let versverschil = 0;
let ontbrekend = 0;
const voorbeelden = [];
for (const boek of index) {
	for (let h = 1; h <= boek.hoofdstukken; h++) {
		const nn = String(h).padStart(2, '0');
		const verzen = hoofdstukken.get(`${boek.code}/${nn}`);
		if (!verzen) { ontbrekend++; continue; }
		const kjv = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'kjv', boek.code, nn + '.json'), 'utf8')).verzen;
		if (kjv.length !== verzen.length) {
			versverschil++;
			voorbeelden.push(`${boek.code} ${h}: KJV ${kjv.length}, Staten ${verzen.length}`);
			// Andere versindeling dan de KJV: versnummers kunnen verspringen, dus niet tonen.
			continue;
		}
		fs.mkdirSync(path.join(OUT, boek.code), { recursive: true });
		fs.writeFileSync(
			path.join(OUT, boek.code, nn + '.json'),
			JSON.stringify({ boek: boek.code, hoofdstuk: h, bron: 'CrossWire SWORD DutSVV 2.1.1', verzen }, null, 1),
		);
		geschreven++;
	}
}
console.log(`${geschreven} hoofdstukken geschreven; ontbrekend: ${ontbrekend}; niet geschreven wegens ander versaantal dan de KJV: ${versverschil}`);
voorbeelden.forEach((v) => console.log('  ' + v));
