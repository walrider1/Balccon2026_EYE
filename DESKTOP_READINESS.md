# EYE — stanje pripreme na ovom računaru

Ovo je softverski kandidat za testiranje, ne potvrda da su fizička instalacija i ljudske probe 100% završene.

## Implementirano

- Glavni tok, opciona CTF istraga, serverom kontrolisane dozvole i završeci.
- Pravi GPT-4.1 mini sa lokalnim konzervativnim budžetom, memorijom sesije i ograničenjima dokaza.
- Sedam dodatnih lore zapisa, Botany/Food sektori, 27 NTSC animacija na odvojenom ekranu.
- Istorija do 500 partija sa administrativnim pregledom.
- Replay: caution/accountability/personhood; novi sporedni Command zapis i drugačiji AI naglasak, stabilan tokom partije i promenjen pri resetu. Varijanta ostaje u sačuvanom stanju i istoriji. Kanon i obavezne šifre se ne menjaju.
- Lokalni launcher sa ograničenim oporavkom od pada; Pi instalater i systemd servis, desktop launcher i predlog Chromium politika.
- Release pakovanje sa SHA-256 manifestom, bez ključa, runtime podataka ili ličnih DOCX fajlova.

## Potrebna lokalna radnja

Pokrenuti scripts/setup-admin.cmd i dva puta uneti sopstvenu šifru od 12–200 znakova. Unos je skriven. Nije postavljena automatska ili zajednička podrazumevana šifra. Posle toga proveriti prijavu na /admin.html. Ranije podeljeni API ključ treba zameniti u lokalnom .env.

## Potvrđene provere

- 71 automatski test: igra, dozvole, istorija, rollback, replay, video oporavak i sintetički tok 72 sata sa 270 partija.
- 79 HTTP provera bez plaćenih AI upita; zasebna proba replay zapisa i njegovog HEAD odgovora.
- 27 video isporuka; 61/61 lokalnih resursa.
- 12 sintetičkih razgovornih scenarija: osam OpenAI odgovora, četiri autorska odgovora; nema literalnih kodova ili ključa u rezultatima. To nije garancija svih mogućih formulacija. Naknadno je dorađen ton da ne završava svaku repliku pitanjem.
- Bash sintaksa obe Pi skripte proverena u WSL-u. Servis, grafičke politike i pozicioniranje monitora nisu provereni na Pi-ju.

## Šta ne proglašavamo završenim

Ljudska ocena i realni višesatni rad; trajna AI memorija kroz restart; fizički Pi, OS zaključavanje, kamera/Arduino/TV signali; rezervna SD slika i oporavak posle prekida napajanja. Detalji: HUMAN_ACCEPTANCE.md i deploy/pi/README.md.

Pokretanje na Windows-u: node server.js, igra http://localhost:5173/, oko http://localhost:5173/eye.html. Oba prozora koriste isti browser profil. Izmene nisu automatski pushovane na GitHub.

Dopuna: ponovljeno istih 12 sintetičkih scenarija nakon dorade tona (ukupno 24 poruke u dve probe). Oba puta: osam modelskih i četiri lokalna odgovora, bez literalnih ključeva/kodova. Ljudsko prihvatanje još nije potvrđeno.

