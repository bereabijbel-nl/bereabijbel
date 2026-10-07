// Tabs met de vertalingen in het versdetail-paneel: BereaBijbel eerst, daarnaast KJV
// (alleen als de pagina die meegeeft; zie PUBLIC_INDEXABLE in Base.astro).
// Gedeeld door de homepage en de hoofdstukpagina (client-side).

export interface BereaVoetnoot {
	nr: number;
	anker: string | null;
	tekst: string;
}

export interface VertalingDetail {
	berea: { tekst: string; voetnoten: BereaVoetnoot[] } | null;
	kjv: string | null;
}

function esc(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bereaTab(b: VertalingDetail["berea"]): string {
	if (!b) return '<p class="placeholder-detail">Nog niet vertaald.</p>';
	let html = `<p class="tab-vers">${esc(b.tekst)}</p>`;
	if (b.voetnoten.length > 0) {
		html += '<p class="field-label">Voetnoten</p><ol class="voetnoten">';
		for (const n of b.voetnoten) {
			const anker = n.anker ? `<span class="vn-anker">${esc(n.anker)}</span> ` : "";
			html += `<li value="${n.nr}">${anker}${esc(n.tekst)}</li>`;
		}
		html += "</ol>";
	}
	return html;
}

export function buildTabs(d: VertalingDetail): string {
	const tabs = [{ id: "berea", naam: "BereaBijbel", inhoud: bereaTab(d.berea) }];
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
