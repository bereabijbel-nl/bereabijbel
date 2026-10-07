// Eén hoofdstuk als JSON, voor de voorbeeldverzen bij de vindplaatsen (hover in het versdetail).
// Per vers: de grondtekst als [woord, Strong]; de BereaBijbel-tekst als die er is; de KJV alleen
// in de demo, net als de Statenvertaling (zelfde schakelaar als noindex, zie Base.astro), de KJV bij voorkeur als tekstdelen met
// Strong-nummers (data/kjv_strong, zie VERSIONS.md), anders als gewone tekst.
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { laadGrondtekstHoofdstuk } from "../../../lib/grondtekst";

interface BoekInfo {
	code: string;
	testament: "ot" | "nt";
	hoofdstukken: number;
}

const DATA = path.join(process.cwd(), "..", "data");

type KjvDeel = [string, string[]?];

function leesKjvStrong(boek: string, bestand: string): Map<number, KjvDeel[]> {
	try {
		const verzen: { vers: number; delen: KjvDeel[] }[] = JSON.parse(
			fs.readFileSync(path.join(DATA, "kjv_strong", boek, bestand), "utf-8"),
		).verzen;
		return new Map(verzen.map((v) => [v.vers, v.delen]));
	} catch {
		return new Map();
	}
}

function leesVerzen(map: string, boek: string, bestand: string): Map<number, string> {
	try {
		const verzen: { vers: number; tekst: string }[] = JSON.parse(
			fs.readFileSync(path.join(DATA, map, boek, bestand), "utf-8"),
		).verzen;
		return new Map(verzen.map((v) => [v.vers, v.tekst]));
	} catch {
		return new Map();
	}
}

export function getStaticPaths() {
	const index: BoekInfo[] = JSON.parse(fs.readFileSync(path.join(DATA, "kjv", "index.json"), "utf-8"));
	return index.flatMap((boek) =>
		Array.from({ length: boek.hoofdstukken }, (_, i) => ({
			params: { boek: boek.code, hoofdstuk: String(i + 1) },
			props: { testament: boek.testament },
		})),
	);
}

export const GET: APIRoute = ({ params, props }) => {
	const boek = params.boek!;
	const hoofdstuk = parseInt(params.hoofdstuk!, 10);
	const bestand = String(hoofdstuk).padStart(2, "0") + ".json";
	const toonKjv = import.meta.env.PUBLIC_INDEXABLE !== "true";

	const grondtekst = laadGrondtekstHoofdstuk(props.testament, boek, hoofdstuk);
	const berea = leesVerzen("bijbel", boek, bestand);
	const kjv = toonKjv ? leesVerzen("kjv", boek, bestand) : new Map<number, string>();
	const staten = toonKjv ? leesVerzen("staten", boek, bestand) : new Map<number, string>();
	const kjvStrong = toonKjv ? leesKjvStrong(boek, bestand) : new Map<number, KjvDeel[]>();

	const nummers = new Set<number>([
		...(grondtekst?.verzen.map((v) => v.vers) ?? []),
		...berea.keys(),
		...kjv.keys(),
	]);
	const verzen: Record<number, { gt?: [string, string][]; berea?: string; staten?: string; kjv?: string; kd?: KjvDeel[] }> = {};
	for (const n of nummers) {
		const gt = grondtekst?.verzen.find((v) => v.vers === n);
		verzen[n] = {
			...(gt ? { gt: gt.woorden.map((w) => [w.tekst, w.strong] as [string, string]) } : {}),
			...(berea.has(n) ? { berea: berea.get(n) } : {}),
			...(staten.has(n) ? { staten: staten.get(n) } : {}),
			...(kjvStrong.has(n) ? { kd: kjvStrong.get(n) } : kjv.has(n) ? { kjv: kjv.get(n) } : {}),
		};
	}
	return new Response(JSON.stringify({ verzen }), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
