import fs from "node:fs";
import path from "node:path";

export interface GrondtekstWoord {
	tekst: string;
	strong: string;
	morf: string | null;
}

export interface GrondtekstVers {
	vers: number;
	woorden: GrondtekstWoord[];
}

export interface GrondtekstHoofdstuk {
	boek: string;
	boeknummer: number;
	hoofdstuk: number;
	bron: string;
	verzen: GrondtekstVers[];
}

export interface Vindplaats {
	boek: string;
	hoofdstuk: number;
	vers: number;
	tekst: string;
}

const GRONDTEKST_ROOT = path.join(process.cwd(), "..", "data", "grondtekst");

export function laadGrondtekstHoofdstuk(
	testament: "ot" | "nt",
	boek: string,
	hoofdstuk: number,
): GrondtekstHoofdstuk | null {
	const bestand = path.join(
		GRONDTEKST_ROOT,
		testament,
		boek,
		String(hoofdstuk).padStart(2, "0") + ".json",
	);
	try {
		return JSON.parse(fs.readFileSync(bestand, "utf-8"));
	} catch {
		return null;
	}
}

let concordantieCache: Record<string, Vindplaats[]> | null = null;

function laadConcordantie(): Record<string, Vindplaats[]> {
	if (concordantieCache) return concordantieCache;
	const bestand = path.join(GRONDTEKST_ROOT, "concordantie.json");
	concordantieCache = JSON.parse(fs.readFileSync(bestand, "utf-8"));
	return concordantieCache!;
}

export interface VindplaatsenResultaat {
	totaal: number;
	voorbeelden: Vindplaats[];
}

const MAX_VOORBEELDEN = 5;

export function zoekVindplaatsen(
	strong: string,
	huidigeVers: { boek: string; hoofdstuk: number; vers: number },
): VindplaatsenResultaat {
	const index = laadConcordantie();
	const alle = index[strong] ?? [];
	const elders = alle.filter(
		(v) =>
			!(v.boek === huidigeVers.boek && v.hoofdstuk === huidigeVers.hoofdstuk && v.vers === huidigeVers.vers),
	);
	return {
		totaal: elders.length,
		voorbeelden: elders.slice(0, MAX_VOORBEELDEN),
	};
}
