// Strong's woordenboek (Grieks of Hebreeuws) als JSON, voor de betekenissen bij een grondtekstwoord.
// Wordt pas opgehaald als iemand een woord aanklikt.
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";

export function getStaticPaths() {
	return [{ params: { taal: "greek" } }, { params: { taal: "hebrew" } }];
}

export const GET: APIRoute = ({ params }) => {
	const bestand = path.join(process.cwd(), "..", "data", "lexicon", `${params.taal}.json`);
	return new Response(fs.readFileSync(bestand, "utf-8"), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
