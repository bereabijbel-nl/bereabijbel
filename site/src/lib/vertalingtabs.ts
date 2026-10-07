// Het versdetail-paneel (client-side), gedeeld door de homepage en de hoofdstukpagina.
// Tabs: Grondtekst eerst (woordenraster + voetnoten), daarnaast KJV (alleen als de pagina
// die meegeeft; zie PUBLIC_INDEXABLE in Base.astro).

export interface BereaVoetnoot {
	nr: number;
	anker: string | null;
	tekst: string;
}

// Eén Nederlands woord of segment en de grondtekstwoorden (index in `woorden`) waar het bij hoort.
// `toevoeging` heeft geen bron. `gewogen` alleen als hier werkelijk iets is afgewogen.
export interface Koppeling {
	nl: string;
	type: "woord" | "segment" | "toevoeging";
	bron: number[];
	gewogen?: boolean;
}

export interface WoordDetail {
	tekst: string;
	strong: string;
	morf: string | null;
	vindplaatsen: {
		totaal: number;
		voorbeelden: { boek: string; naam: string; hoofdstuk: number; vers: number; tekst: string }[];
	};
}

export interface VertalingDetail {
	berea: { tekst: string; voetnoten: BereaVoetnoot[] } | null;
	kjv: string | null;
}

export interface VersDetail extends VertalingDetail {
	grondtekst: string | null;
	woorden: WoordDetail[];
	koppeling: Koppeling[] | null;
	rtl: boolean;
}

function esc(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function voetnotenHtml(b: VertalingDetail["berea"]): string {
	if (!b || b.voetnoten.length === 0) return "";
	let html = '<p class="field-label">Voetnoten</p><ul class="voetnoten">';
	for (const n of b.voetnoten) {
		const anker = n.anker ? `<span class="vn-anker">${esc(n.anker)}</span> ` : "";
		html += `<li data-anker="${esc(n.anker ?? "")}">${anker}${esc(n.tekst)}</li>`;
	}
	return html + "</ul>";
}

function rasterHtml(d: VersDetail): string {
	if (!d.grondtekst) {
		return '<p class="placeholder-detail">Nog geen grondtekst gekoppeld aan dit vers.</p>';
	}
	const koppeling = d.koppeling;
	let html = `<div class="segmenten"${d.rtl ? ' dir="rtl"' : ""}>`;
	d.woorden.forEach((w, i) => {
		const k = koppeling?.filter((x) => x.bron.includes(i)) ?? [];
		const gewogen = k.some((x) => x.gewogen);
		const nl = k.map((x) => x.nl).join(" ");
		html += `<button type="button" class="segment${gewogen ? " gewogen" : ""}" data-i="${i}" aria-expanded="false">`;
		html += `<span class="seg-grondtekst" lang="${d.rtl ? "he" : "grc"}">${esc(w.tekst)}</span>`;
		if (koppeling) {
			html += nl
				? `<span class="seg-nl">${esc(nl)}</span>`
				: '<span class="seg-nl leeg" title="Niet apart vertaald">—</span>';
		}
		html += `<span class="seg-strong">${esc(w.strong)}</span></button>`;
	});
	html += "</div>";
	const toevoegingen = koppeling?.filter((x) => x.type === "toevoeging") ?? [];
	if (toevoegingen.length > 0) {
		html += `<p class="toevoeging-note">Toegevoegd in het Nederlands, zonder grondtekstwoord: ${toevoegingen
			.map((x) => esc(x.nl))
			.join(", ")}</p>`;
	}
	return html + '<div class="woord-uitleg" hidden></div>';
}

function buildTabs(d: VersDetail): string {
	const tabs = [
		{ id: "berea", naam: "Grondtekst", inhoud: rasterHtml(d) + voetnotenHtml(d.berea) },
	];
	if (d.kjv !== null) {
		tabs.push({ id: "kjv", naam: "KJV", inhoud: `<p class="tab-vers">${esc(d.kjv)}</p>` });
	}
	let html = "";
	if (tabs.length > 1) {
		html += '<div class="tabs" role="tablist">';
		tabs.forEach((t, i) => {
			html += `<button type="button" class="tab" role="tab" data-tab="${t.id}" aria-selected="${i === 0}">${t.naam}</button>`;
		});
		html += "</div>";
	}
	tabs.forEach((t, i) => {
		html += `<div class="tab-paneel" role="tabpanel" data-paneel="${t.id}"${i === 0 ? "" : " hidden"}>${t.inhoud}</div>`;
	});
	return html;
}

function vindplaatsenHtml(w: WoordDetail): string {
	const { totaal, voorbeelden } = w.vindplaatsen;
	if (totaal === 0) {
		return '<p class="vindplaatsen-note">Geen andere vindplaatsen van dit grondtaalwoord.</p>';
	}
	let html = '<ul class="vindplaatsen-list">';
	for (const vp of voorbeelden) {
		html += `<li class="vp-item" data-boek="${vp.boek}" data-hst="${vp.hoofdstuk}" data-vers="${vp.vers}" data-vorm="${esc(vp.tekst)}" data-strong="${w.strong}"><div class="vp-item-hoofd"><a class="vp-ref" href="/${vp.boek}/${vp.hoofdstuk}#vers-${vp.vers}">${vp.naam} ${vp.hoofdstuk}:${vp.vers}</a><span class="vp-vorm">${vp.tekst}</span></div></li>`;
	}
	html += '</ul><div class="vp-voorbeeld" hidden></div>';
	if (totaal > voorbeelden.length) {
		const rest = totaal - voorbeelden.length;
		html += `<p class="vindplaatsen-note">En ${rest} andere vindplaats${rest === 1 ? "" : "en"} (totaal ${totaal}).</p>`;
	}
	return html;
}

function woordUitlegHtml(w: WoordDetail): string {
	let html = `<p class="uitleg-intro"><b>${w.strong}</b>${w.morf ? " — " + w.morf : ""}</p>`;
	html += '<p class="field-label">Ook elders in de Bijbel</p>';
	return html + vindplaatsenHtml(w);
}

// Omhult de woorden van de Nederlandse verstekst met <span class="vw">, in dezelfde volgorde als
// `koppeling`. Klopt het aantal of een woord niet, dan blijft de tekst ongemoeid (geen gokwerk).
function markeerWoorden(vtekst: HTMLElement, d: VersDetail): void {
	if (!d.koppeling || vtekst.querySelector(".vw")) return;
	const tekst = vtekst.textContent ?? "";
	const tokens = [...tekst.matchAll(/[\p{L}\p{N}]+/gu)];
	if (tokens.length !== d.koppeling.length) return;
	if (!tokens.every((t, j) => t[0].toLowerCase() === d.koppeling![j].nl.toLowerCase())) return;
	let html = "";
	let positie = 0;
	tokens.forEach((t, j) => {
		html += esc(tekst.slice(positie, t.index)) + `<span class="vw" data-k="${j}">${esc(t[0])}</span>`;
		positie = t.index! + t[0].length;
	});
	vtekst.innerHTML = html + esc(tekst.slice(positie));
}

interface HoofdstukJson {
	verzen: Record<string, { gt?: [string, string][]; berea?: string; kjv?: string; kd?: [string, string[]?][] }>;
}
const hoofdstukCache = new Map<string, Promise<HoofdstukJson | null>>();

function haalHoofdstuk(boek: string, hoofdstuk: string): Promise<HoofdstukJson | null> {
	const sleutel = `${boek}/${hoofdstuk}`;
	let p = hoofdstukCache.get(sleutel);
	if (!p) {
		p = fetch(`/api/${sleutel}.json`)
			.then((r) => (r.ok ? (r.json() as Promise<HoofdstukJson>) : null))
			.catch(() => null);
		hoofdstukCache.set(sleutel, p);
	}
	return p;
}

// Toont het vers van een vindplaats in het uitlegblok: de Nederlandse tekst als die er is, de KJV
// (alleen in de demo) en de grondtekst. Het woord is gemarkeerd zoals bij de verstekst: in de
// grondtekst en in de KJV (via het Strong-nummer). In de Nederlandse tekst kan dat pas als de
// pijplijn een woordkoppeling voor dat vers levert.
async function toonVoorbeeld(item: HTMLElement, doel: HTMLElement): Promise<void> {
	const { boek, hst, vers, vorm, strong } = item.dataset;
	const sleutel = `${boek}/${hst}:${vers}`;
	doel.dataset.huidig = sleutel;
	const data = await haalHoofdstuk(boek!, hst!);
	if (doel.dataset.huidig !== sleutel) return; // intussen is een ander vers aangewezen
	const v = data?.verzen[vers!];
	if (!v) {
		doel.hidden = true;
		return;
	}
	let html = "";
	if (v.berea) html += `<p class="vp-vers">${esc(v.berea)}</p>`;
	if (v.kd) {
		// Het Engelse woord of de woordgroep met hetzelfde Strong-nummer (uit de bron, niet geraden).
		const delen = v.kd
			.map(([t, s]) => (s?.includes(strong!) ? `<span class="vw licht">${esc(t)}</span>` : esc(t)))
			.join("");
		html += `<p class="vp-vers"><span class="vp-bron">KJV</span> ${delen}</p>`;
	} else if (v.kjv) {
		html += `<p class="vp-vers"><span class="vp-bron">KJV</span> ${esc(v.kjv)}</p>`;
	}
	if (v.gt) {
		let gemarkeerd = v.gt.findIndex(([t, s]) => s === strong && t === vorm);
		if (gemarkeerd < 0) gemarkeerd = v.gt.findIndex(([, s]) => s === strong);
		html += `<p class="vp-grondtekst" lang="grc">${v.gt
			.map(([t], i) => (i === gemarkeerd ? `<span class="vw licht">${esc(t)}</span>` : esc(t)))
			.join(" ")}</p>`;
	}
	doel.innerHTML = html;
	doel.hidden = html === "";
}

// Bouwt het paneel en koppelt de tabs en het woordenraster. Een klik op een woord toont
// waar het elders voorkomt (met links naar die verzen); bij een gewogen woord licht ook de
// bijbehorende voetnoot op. Met de muis op een blok licht het bijbehorende Nederlandse woord op.
export function vulDetailPaneel(panel: HTMLElement, d: VersDetail): void {
	panel.innerHTML = buildTabs(d);
	koppelTabs(panel);
	const vtekst = panel.closest(".vers")?.querySelector<HTMLElement>(".vtekst") ?? null;
	if (vtekst) markeerWoorden(vtekst, d);

	const uitlegEl = panel.querySelector<HTMLElement>(".woord-uitleg");
	const segmenten = panel.querySelectorAll<HTMLElement>(".segment");

	// Andersom: muis op een Nederlands woord licht de bijbehorende grondtekstblokken op, klikken opent
	// hetzelfde als bij het blok.
	// `onmouseenter` (geen addEventListener): de woorden blijven bestaan als het paneel sluit en
	// weer opent, zo stapelen de handlers zich niet op.
	vtekst?.querySelectorAll<HTMLElement>(".vw").forEach((vw) => {
		const bron = d.koppeling?.[parseInt(vw.dataset.k || "0", 10)]?.bron ?? [];
		const zet = (aan: boolean) =>
			bron.forEach((i) => segmenten[i]?.classList.toggle("licht", aan));
		vw.onmouseenter = () => zet(true);
		vw.onmouseleave = () => zet(false);
		// Klik op een woord = klik op het bijbehorende grondtekstblok. Een woord zonder grondtekst
		// (zoals een toevoeging) doet niets en laat de klik door, zodat het vers dichtklapt.
		vw.onclick = (e) => {
			if (bron.length === 0) return;
			e.stopPropagation();
			segmenten[bron[0]]?.click();
			const uitleg = panel.querySelector<HTMLElement>(".woord-uitleg");
			if (uitleg && !uitleg.hidden) uitleg.scrollIntoView({ block: "nearest", behavior: "smooth" });
		};
	});
	segmenten.forEach((seg) => {
		const i = parseInt(seg.dataset.i || "0", 10);
		const licht = (aan: boolean) => {
			if (!vtekst) return;
			d.koppeling?.forEach((k, j) => {
				if (k.bron.includes(i)) {
					vtekst.querySelector(`.vw[data-k="${j}"]`)?.classList.toggle("licht", aan);
				}
			});
		};
		seg.addEventListener("mouseenter", () => licht(true));
		seg.addEventListener("mouseleave", () => licht(false));
		seg.addEventListener("focus", () => licht(true));
		seg.addEventListener("blur", () => licht(false));
		seg.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!uitlegEl) return;
			const dichtklappen = !uitlegEl.hidden && uitlegEl.dataset.open === String(i);

			segmenten.forEach((s) => s.setAttribute("aria-expanded", "false"));
			panel.querySelectorAll(".voetnoten li").forEach((li) => li.classList.remove("actief"));
			if (dichtklappen) {
				uitlegEl.hidden = true;
				uitlegEl.dataset.open = "";
				return;
			}

			seg.setAttribute("aria-expanded", "true");
			uitlegEl.innerHTML = woordUitlegHtml(d.woorden[i]);
			uitlegEl.hidden = false;
			uitlegEl.dataset.open = String(i);

			const voorbeeld = uitlegEl.querySelector<HTMLElement>(".vp-voorbeeld");
			uitlegEl.querySelectorAll<HTMLElement>(".vp-item").forEach((item) => {
				if (!voorbeeld) return;
				item.addEventListener("mouseenter", () => toonVoorbeeld(item, voorbeeld));
				item.addEventListener("focusin", () => toonVoorbeeld(item, voorbeeld));
			});

			if (seg.classList.contains("gewogen")) {
				const nl = seg.querySelector(".seg-nl")?.textContent ?? "";
				panel.querySelectorAll<HTMLElement>(".voetnoten li").forEach((li) => {
					if (li.dataset.anker && nl.split(" ").includes(li.dataset.anker)) {
						li.classList.add("actief");
					}
				});
			}
		});
	});
}

export function koppelTabs(panel: HTMLElement): void {
	const knoppen = panel.querySelectorAll<HTMLElement>(".tab");
	knoppen.forEach((knop) => {
		knop.addEventListener("click", (e) => {
			e.stopPropagation();
			knoppen.forEach((k) => k.setAttribute("aria-selected", String(k === knop)));
			panel.querySelectorAll<HTMLElement>(".tab-paneel").forEach((p) => {
				p.hidden = p.dataset.paneel !== knop.dataset.tab;
			});
		});
	});
}
