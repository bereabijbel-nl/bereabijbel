// Bouwt een concordantie-index: strong-nummer -> alle vindplaatsen (boek, hoofdstuk,
// vers, grondtaalwoord) in de hele Bijbel. Bron: de net gegenereerde
// data/grondtekst/ot/ en data/grondtekst/nt/ bestanden.
const fs = require('fs');
const path = require('path');

const grondtekstRoot = process.argv[2];
const outFile = process.argv[3];

const index = {}; // strong -> [{boek, hoofdstuk, vers, tekst}]

for (const testament of ['ot', 'nt']) {
	const testamentDir = path.join(grondtekstRoot, testament);
	if (!fs.existsSync(testamentDir)) continue;
	for (const boekCode of fs.readdirSync(testamentDir)) {
		const boekDir = path.join(testamentDir, boekCode);
		if (!fs.statSync(boekDir).isDirectory()) continue;
		for (const bestand of fs.readdirSync(boekDir)) {
			const data = JSON.parse(fs.readFileSync(path.join(boekDir, bestand), 'utf-8'));
			for (const versObj of data.verzen) {
				for (const woord of versObj.woorden) {
					if (!index[woord.strong]) index[woord.strong] = [];
					index[woord.strong].push({
						boek: boekCode,
						hoofdstuk: data.hoofdstuk,
						vers: versObj.vers,
						tekst: woord.tekst,
					});
				}
			}
		}
	}
}

fs.writeFileSync(outFile, JSON.stringify(index), 'utf-8');

const aantalStrongs = Object.keys(index).length;
const totaalVoorkomens = Object.values(index).reduce((s, a) => s + a.length, 0);
console.log('Strong-nummers:', aantalStrongs, '| totaal voorkomens:', totaalVoorkomens);
console.log('Bestandsgrootte:', (fs.statSync(outFile).size / 1024 / 1024).toFixed(1), 'MB');
