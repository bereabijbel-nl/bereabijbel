# Vastgepinde grondtekstversies

## Oude Testament — Westminster Leningrad Codex

- **Bron**: [openscriptures/morphhb](https://github.com/openscriptures/morphhb), map `wlc/`
- **Opgehaald**: 2026-09-11, van de `master`-branch
- **Tekst**: publiek domein (Christopher V. Kimball / tanach.us)
- **Morfologie- en Strong-laag**: **Creative Commons Attribution 4.0** (Daniel Owens, David Troidl) — dit is een licentienuance ten opzichte van wat elders in dit project als "publiek domein" is aangenomen. Naamsvermelding is vereist zolang deze laag gebruikt wordt. Zet een credit-regel op de site (bijv. bij "Over" of in de footer): "Morfologie en Strong-codering: Open Scriptures Hebrew Bible (CC BY 4.0)."
- **Versnummering**: omgezet van de Hebreeuwse naar de Engelse/KJV-hoofdstuk-en-versindeling met de officiële `VerseMap.xml` uit dezelfde bron. Zonder deze omzetting wijken minstens twee boeken (Joël, Maleachi) af in hoofdstuktelling.
- **Bekende restafwijking**: 6 van de 929 hoofdstukken (1 Koningen 18, 20, 22; Nehemia 7; Psalm 13; Jesaja 63) hebben een verschil van precies 1 vers ten opzichte van de KJV-telling, door halve-verssamenvoegingen die niet 1-op-1 in het datamodel passen. Zie de `VerseMap.xml`-vermeldingen met `type="partial"`.

## Nieuwe Testament — Elzevir Textus Receptus

- **Bron**: [byztxt/greektext-elzevir](https://github.com/byztxt/greektext-elzevir), map `parsed/`
- **Opgehaald**: 2026-09-11, van de `master`-branch
- **Licentie**: publiek domein, expliciet vermeld in de README ("Public Domain. Copy freely.") — geen naamsvermeldingsplicht.
- **Tekstcodering**: de brontekst staat in een vereenvoudigde ASCII-transcriptie zonder accenten/ademingen (bijv. `logov` voor λόγος). Omgezet naar Unicode Grieks met een letter-voor-letter tabel, geverifieerd tegen Johannes 1:1 en de Unicode-editie van de verwante Byzantine Majority Text (`byztxt/byzantine-majority-text`).
- **Beperking**: de weergegeven Griekse tekst bevat geen accenten, ademingtekens of iota subscriptum — alleen de kale letters. Dit is een bewuste, tijdelijke vereenvoudiging; geen tekst-kritische informatie gaat verloren (Strong-nummers en morfologie zijn volledig intact), maar de tekst is niet geschikt om als definitieve typografische weergave te tonen zonder dit later aan te vullen met een geaccentueerde bron.

## Concordantie-index

`concordantie.json` (niet in git, of wel — zie `.gitignore`) is gegenereerd uit bovenstaande bestanden: voor elk Strong-nummer alle vindplaatsen (boek, hoofdstuk, vers, grondtaalwoord) in de hele Bijbel. Bij wijziging van de brondata opnieuw genereren met `pipeline/scripts/bouw-concordantie.js`.
