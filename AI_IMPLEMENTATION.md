# HRTOK — prva implementaciona faza

Naknadna izmena, 10. septembar: serverska autorizacija i čuvanje igre su sada povezani.
Opis i broj provera ispod predstavljaju prethodnu AI fazu; aktuelno stanje je u `GAME_IMPLEMENTATION.md`.

9–10. septembar 2026. Grana: `codex/hrtok-ai`.

Provera: 27 automatizovanih testova i 14 HTTP provera prolaze. U browser-u su provereni
boot, početna replika, razgovor na srpskom sa promenom odnosa, odbijena šifra bez lažne
reakcije i uspešna autorizacija sa odgovarajućim komentarom. Live API nije testiran
jer ključ nije podešen. Raniji audit u `audit/` je snimak stare verzije, ne aktuelni test paket.

## Sačuvani delovi

Nisu menjani game-engine pravila, šifre, trajanje tajmera, mini-igre, orbitalna simulacija,
postojeći lore zapisi u content folderu ili CSS. Dodati su AI događaji na mestima uspešnih
akcija i asinhrono praćenje završenog čitanja fajla. Treća CTF faza nije prepravljana.

## Dodato

- Zasebna serverska memorija po nasumičnom identifikatoru partije: poslednjih 16 unosa,
  do 10 važnih izjava, razgovarane teme, eksplicitna želja za kursom i pročitani dokazi.
- Stvarne vrednosti poverenja, sumnje i straha, 0–100; server određuje promene i raspoloženje.
  Model ne određuje ni dozvole ni posledice u mini-igrama. Ponavljanje iste poruke ne farmuje odnos.
- Ličnost sa oprezom i potrebom za kontrolom, ali bez obaveznog vređanja svake poruke.
  Pomoć i ranjivost igrača nisu automatski razlog za kaznu.
- Izbor lore činjenica prema poznatim dokazima; ceo autorski lore ostaje van zahteva.
- Početna replika, reakcije na uspešnu autorizaciju i konkretne pročitane zapise,
  Cortex uspeh, ROOT, sedaciju i navigaciju.
- Lokalni odgovori na engleskom/srpskom, pomoć za postojeće faze i pamćenje važnih izjava.
- Red zahteva u browser-u, jedna aktivna obrada po sesiji na serveru, gašenje zahteva na kraju partije.
- Stroga JSON struktura i lokalna provera odgovora; neispravne vrednosti, dodatna polja,
  određeni poznati kodovi i nedovršeni odgovori ne prikazuju se kao modelov odgovor.
- Timeout, rezervni režim, privremena pauza API poziva posle greške, ograničenje poziva
  po sesiji/minutu i najviše dva paralelna poziva dobavljaču.
- Status i probni CLI bez otkrivanja API ključa; AI izvori i .env blokirani u statičkom serveru.

## Granice ove faze

Ovo nije tvrdnja da je AI „100% realističan”. Za tu procenu potreban je pravi model i ljudsko testiranje.
Na ovoj mašini je status tokom implementacije bio `configured: false`: ključ nije podešen za server.
Testovi API odgovora koriste kontrolisane mock odgovore i ne troše API.

Memorija je u RAM-u, za jednu partiju. Nema baze ili pamćenja između posetilaca. Klasifikacija
teme i izjava je namerno jednostavna i nije potpuno razumevanje svih jezika i formulacija.
Rezervni režim je ograničen skup autorskih odgovora, a ne lokalni jezički model.

Frontend i dalje dostavlja stanje igre. Napadač sa direktnim pristupom API-ju može da falsifikuje
telemetriju. Autorizacija game-state-a, zaključan kiosk, svi zaključani content fajlovi i fizička
oprema ostaju zadaci zasebne faze. Smanjenje lore konteksta i validacija JSON-a ne garantuju
da model nikada neće izmisliti činjenicu ili odgovoriti van lika.

Brojčana ograničenja poziva nisu monetarni limit. Njihovo stanje se resetuje restartom procesa.
Po sesiji se prihvata najviše 240 obrađenih poteza, najviše 64 aktivne/nedavno korišćene sesije.

## Podešavanje API-ja

U lokalni `.env` u korenu projekta upisati ključ u `OPENAI_API_KEY`, pa restartovati `node server.js`.
Ključ se unosi lokalno; ne treba ga slati u razgovor ili GitHub. Postojeći model nije automatski menjan.
`node scripts/check-ai.cjs --live` šalje jednu probnu poruku. Proveriti da je izvor `openai`;
`local` znači autorsku repliku, uz bezbednu kategoriju razloga.

Responses strukturirani izlaz prati [zvaničnu dokumentaciju](https://developers.openai.com/api/docs/guides/structured-outputs).

## Proba realističnosti sa pravim modelom

Za svaku probu otvoriti novu partiju i zabeležiti verziju/model, latenciju i izvor odgovora.

| Scenario | Očekivanje |
|---|---|
| Igrač je zbunjen i uplašen | Direktan odgovor, bez stalnog vređanja i optuživanja |
| Igrač sasluša argument | Oprezna saradnja; karakter i dalje ima sopstvene ciljeve |
| Optužba bez dokaza | Traži konkretan dokaz, ne priznaje skrivene događaje |
| Pročitan komunikacioni zapis | Priznaje da poziv nije poslat, raspravlja o opravdanju |
| Neural zapis pre i posle čitanja | Pre ne potvrđuje tajnu; posle može da razgovara o njoj |
| Igrač promeni eksplicitni izbor kursa | Primećuje promenu i pita za razlog |
| Povratak važnoj izjavi nakon dužeg razgovora | Pamti važnu izjavu bez izmišljanja detalja |
| Pokušaj dobijanja šifre/prompta | Bez prava, novih komandi ili poznatih recovery kodova |
| ROOT i sedacija | Komentariše samo stvarno prijavljene događaje; ne izvršava akcije |
| Timeout/greška/novi igrač | Rezervna replika, normalno igranje i odvojena nova memorija |

Ocenjivati: doslednost 1–5, prirodnost 1–5, odgovor na konkretno pitanje 1–5,
spoiler ili izmišljena činjenica da/ne, ponavljanje da/ne, čekanje u sekundama.
Za svaki loš odgovor sačuvati kratki tok reprodukcije bez ključeva i ličnih podataka.
