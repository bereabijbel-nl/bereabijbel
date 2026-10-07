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

## Demo-vuldata — KJV met Strong-nummers

- **Bron**: [CrossWire SWORD Project, module KJV 3.1](https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=KJV) (2023-07-19), pakket `KJV.zip` (4 026 621 bytes)
- **Opgehaald**: 2026-10-07 van `crosswire.org/ftpmirror/pub/sword/packages/rawzip/KJV.zip`
- **Gebruik**: alleen in de demo, om bij een vindplaats het Engelse woord te markeren dat bij het Strong-nummer hoort. Zelfde schakelaar als `noindex` (`PUBLIC_INDEXABLE`); in productie wordt het niet getoond.
- **Licentie**: CrossWire: "hereby grants a general public license to use this text for any purpose"; distributielicentie GPL. Past niet vanzelf bij de CC0-regel voor onze data. Daarom staat het onveranderde `KJV.zip` apart in `pipeline/vuldata/` (met `NOTICE.md`, buiten `data/`) en de omgezette uitvoer (`data/kjv_strong/`) in `.gitignore`. In productiebuilds (`PUBLIC_INDEXABLE=true`) wordt het niet omgezet en niet getoond.
- **Omzetting**: `pipeline/scripts/verwerk-kjv-strong.js` (als argument `pipeline/vuldata/KJV.zip`; draait ook als `prebuild` van de site). Per vers een lijst van tekstdelen met hun Strong-nummers. Voetnoten en koppen vallen weg.
- **Controle**: alle 31 102 verzen sluiten aan op onze versindeling; in 293 verzen verschilt de tekst licht van `data/kjv` (leestekens, uitgavenverschil).


## Statenvertaling (naast de BereaBijbel)

- **Bron**: [CrossWire SWORD Project, module DutSVV 2.1.1](https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=DutSVV) (2020-08-01), pakket `DutSVV.zip` (1 606 261 bytes)
- **Opgehaald**: 2026-10-07 van `crosswire.org/ftpmirror/pub/sword/packages/rawzip/DutSVV.zip`
- **Licentie**: "Public Domain" (volgens de module). Tekst gebaseerd op de elektronische editie van Statenvertaling online.
- **Gebruik**: alleen ter weergave in de tab "Bijbels" en bij de vindplaatsen, in de demo (zelfde schakelaar als de KJV). **Nooit in vertaalprompts** (CLAUDE.md, absolute regel 1).
- **Omzetting**: `pipeline/scripts/verwerk-staten.js` naar `data/staten/<boek>/<hoofdstuk>.json`. Voetnoten vallen weg.
- **Bekende restafwijking**: twee hoofdstukken hebben een ander versaantal dan de KJV-indeling (1 Samuël 23: 28 tegen 29; Handelingen 19: 40 tegen 41). Die worden niet getoond, omdat de versnummers daar zouden verspringen.

## Strong's woordenboeken (betekenissen bij een grondtekstwoord)

- **Bron**: [openscriptures/strongs](https://github.com/openscriptures/strongs): `greek/strongsgreek.dat` (989 987 bytes) en `hebrew/strongshebrew.dat` (1 456 344 bytes)
- **Opgehaald**: 2026-10-07, van de `master`-branch
- **Inhoud**: Strong's Exhaustive Concordance (1890), de woordenboeken van Grieks (5 624 nummers) en Hebreeuws (8 674). Engelstalig.
- **Licentie**: de woordenboeken van Strong zijn publiek domein, net als de oorspronkelijke e-tekst van Michael Grier. De gecorrigeerde uitgave van OpenScriptures (2008) behoudt die status en wordt vrijgegeven met een toestemmingstekst in MIT-stijl: "Copyright (c) 2008, OpenScriptures.org … The above copyright notice and this permission notice shall be included in all copies". De kop noemt dit "GPL 3.0", maar de tekst zelf is een MIT-toestemming. Die tegenstrijdigheid staat in de bron. Naamsvermelding: *Strong's Dictionaries, e-tekst van Michael Grier, gecorrigeerd door Ulrik Sandborg-Petersen, Weston Ruter en OpenScriptures.org*.
- **Bewust niet gebruikt**: de JSON-versie van OpenScriptures (`strongs-*-dictionary.js`) is CC-BY-SA; share-alike past niet bij onze CC0-data.
- **Omzetting**: `pipeline/scripts/verwerk-strong-lexicon.js` naar `data/lexicon/greek.json` en `hebrew.json` (5 523 en 8 674 vermeldingen; 101 Griekse nummers zijn in de bron "Not Used"). Per nummer: transliteratie, uitspraak, definitie en de weergaven in de KJV.
- **Taal**: Engels, niet vertaald door een model. Lexicale gegevens moeten verifieerbaar zijn in het woordenboek zelf (CLAUDE.md, notities).
- **Gebruik**: bij een aangeklikt grondtekstwoord (`Betekenissen`) en op de pagina `/strong/<nummer>`.
