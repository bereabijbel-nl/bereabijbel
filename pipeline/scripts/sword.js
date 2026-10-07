// Gedeelde hulpfuncties voor het lezen van CrossWire SWORD-modules (zText, OSIS) uit een zip of map.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimale zip-lezer (alleen "stored" en "deflate"): geeft de inhoud van één bestand uit de zip.
function zipLezer(bestand) {
	const zip = fs.readFileSync(bestand);
	let eocd = zip.length - 22;
	while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
	if (eocd < 0) throw new Error('geen geldige zip: ' + bestand);
	const aantal = zip.readUInt16LE(eocd + 10);
	let pos = zip.readUInt32LE(eocd + 16);
	const items = new Map();
	for (let i = 0; i < aantal; i++) {
		const methode = zip.readUInt16LE(pos + 10);
		const csize = zip.readUInt32LE(pos + 20);
		const nlen = zip.readUInt16LE(pos + 28);
		const xlen = zip.readUInt16LE(pos + 30);
		const clen = zip.readUInt16LE(pos + 32);
		const lokaal = zip.readUInt32LE(pos + 42);
		items.set(zip.toString('utf8', pos + 46, pos + 46 + nlen), { methode, csize, lokaal });
		pos += 46 + nlen + xlen + clen;
	}
	return (naam) => {
		const it = items.get(naam);
		if (!it) throw new Error('niet in zip: ' + naam);
		const start = it.lokaal + 30 + zip.readUInt16LE(it.lokaal + 26) + zip.readUInt16LE(it.lokaal + 28);
		const data = zip.subarray(start, start + it.csize);
		return it.methode === 8 ? zlib.inflateRawSync(data) : data;
	};
}

// Geeft een functie (relatief pad) -> Buffer, voor een zip of een uitgepakte map.
function maakLezer(bron) {
	return fs.statSync(bron).isFile() ? zipLezer(bron) : (naam) => fs.readFileSync(path.join(bron, naam));
}

// Alle items (kopteksten en verzen, in volgorde) van één testament, bijv. basis 'modules/texts/ztext/kjv/ot'.
function laadItems(lees, basis) {
	const bzs = lees(basis + '.bzs');
	const bzz = lees(basis + '.bzz');
	const bzv = lees(basis + '.bzv');
	const blokken = [];
	for (let i = 0; i < bzs.length; i += 12) {
		const o = bzs.readUInt32LE(i);
		const c = bzs.readUInt32LE(i + 4);
		blokken.push(zlib.inflateSync(bzz.subarray(o, o + c)));
	}
	const items = [];
	for (let i = 0; i < bzv.length; i += 10) {
		const blok = bzv.readUInt32LE(i);
		const off = bzv.readUInt32LE(i + 4);
		const len = bzv.readUInt16LE(i + 8);
		items.push(len ? blokken[blok].subarray(off, off + len).toString('utf8') : '');
	}
	return items;
}

module.exports = { maakLezer, laadItems };
