// Zet de CrossWire SWORD-module KJV (met Strong-nummers per woord) om naar JSON per hoofdstuk.
// Alleen vuldata voor de demo: de uitvoer (data/kjv_strong/) staat niet in git, zie .gitignore,
// pipeline/vuldata/NOTICE.md en data/grondtekst/VERSIONS.md. In een productiebuild
// (PUBLIC_INDEXABLE=true) doet het script niets.
//
// Gebruik: node pipeline/scripts/verwerk-kjv-strong.js <KJV.zip of de map met de uitgepakte zip>
// Invoer:  modules/texts/ztext/kjv/{ot,nt}.{bzs,bzv,bzz}
// Uitvoer: data/kjv_strong/<boek>/<hoofdstuk>.json
//          { boek, hoofdstuk, bron, verzen: [{ vers, delen: [[tekst, [strong, ...]?], ...] }] }
const fs = require('fs');
const path = require('path');

if (process.env.PUBLIC_INDEXABLE === 'true') {
	console.log('productiebuild: KJV met Strong-nummers wordt overgeslagen');
	process.exit(0);
}
const bron = process.argv[2];
if (!bron) {
	console.error('Gebruik: node verwerk-kjv-strong.js <KJV.zip of map met uitgepakte KJV.zip>');
	process.exit(1);
}
const ROOT = path.join(__dirname, '..', '..');
const KJV = path.join(ROOT, 'data', 'kjv');
const OUT = path.join(ROOT, 'data', 'kjv_strong');

const { maakLezer, laadItems } = require('./sword');
const lees = maakLezer(bron);
const laadTestament = (naam) => laadItems(lees, 'modules/texts/ztext/kjv/' + naam);

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
const ontsnap = (s) => s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m]);

// "strong:H07225 strong:H01254" -> ["H7225", "H1254"]
function strongs(attrs) {
	const lemma = /lemma="([^"]*)"/.exec(attrs);
	if (!lemma) return [];
	return [...lemma[1].matchAll(/strong:([GH])0*(\d+)/g)].map((m) => m[1] + m[2]);
}

// OSIS-fragment van één vers -> delen: [tekst, strongs?]. Voetnoten en koppen vallen weg.
function verwerkVers(osis) {
	const delen = [];
	let huidig = [];
	let inNoot = 0;
	const voeg = (tekst) => {
		if (!tekst) return;
		const laatste = delen[delen.length - 1];
		if (laatste && laatste[1].join() === huidig.join()) laatste[0] += tekst;
		else delen.push([tekst, [...huidig]]);
	};
	for (const m of osis.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g)) {
		const [, sluit, tag, attrs, zelfsluitend, tekst] = m;
		if (tekst !== undefined) {
			if (!inNoot) voeg(ontsnap(tekst));
		} else if (tag === 'note' && !zelfsluitend) inNoot += sluit ? -1 : 1;
		else if (tag === 'w' && !zelfsluitend) huidig = sluit ? [] : strongs(attrs);
	}
	return delen.map(([t, s]) => (s.length ? [t, s] : [t]));
}

const index = JSON.parse(fs.readFileSync(path.join(KJV, 'index.json'), 'utf8'));
const items = { ot: laadTestament('ot'), nt: laadTestament('nt') };
const positie = { ot: 2, nt: 2 }; // 0 = lege kop, 1 = module-kop

let hoofdstukken = 0;
let verzen = 0;
let afwijkend = 0;
for (const boek of index) {
	const t = boek.testament;
	positie[t] += 1; // boekkop
	for (let h = 1; h <= boek.hoofdstukken; h++) {
		const nn = String(h).padStart(2, '0');
		const kjv = JSON.parse(fs.readFileSync(path.join(KJV, boek.code, nn + '.json'), 'utf8'));
		positie[t] += 1; // hoofdstukkop
		const uit = [];
		for (const v of kjv.verzen) {
			const delen = verwerkVers(items[t][positie[t]++] ?? '');
			// Controle: dezelfde woorden als onze KJV-tekst (de uitgaven verschillen licht in leestekens).
			const w = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
			if (w(delen.map((d) => d[0]).join('')) !== w(v.tekst)) afwijkend++;
			uit.push({ vers: v.vers, delen });
			verzen++;
		}
		fs.mkdirSync(path.join(OUT, boek.code), { recursive: true });
		fs.writeFileSync(
			path.join(OUT, boek.code, nn + '.json'),
			JSON.stringify({ boek: boek.code, hoofdstuk: h, bron: 'CrossWire SWORD KJV 3.1', verzen: uit }),
		);
		hoofdstukken++;
	}
}
const rest = { ot: items.ot.length - positie.ot, nt: items.nt.length - positie.nt };
console.log(`${hoofdstukken} hoofdstukken, ${verzen} verzen; woordafwijking t.o.v. data/kjv: ${afwijkend}; ongebruikte items: ot ${rest.ot}, nt ${rest.nt}`);
