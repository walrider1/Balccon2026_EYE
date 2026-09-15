# BalCCon EYE — pregled implementacije, 9. septembar 2026.

Pregledana verzija: `main`, commit `cfbca5d` (17. avgust 2026). Ovo je pregled, ne završena dorada aplikacije. Produkcioni kod nije menjan. Audit skripte i rezultati su u `audit/`.

## Zaključak

Postoji funkcionalan prototip sa prepoznatljivim izgledom, komandama, dve mini-igre i AI adapterom. Za završnu izložbenu aplikaciju preostaju ozbiljan rad na stvarnom stanju AI ličnosti, zaštiti uređaja i servera, narativnim granama, sadržaju, integraciji opreme i testiranju. Nije opravdano navoditi jedinstven procenat završenosti dok oprema, tačan obim i prihvatni kriterijumi nisu zaključani.

Aktuelni program koristi Node.js i JavaScript u pregledaču. Python/SQLite iz ranog arhitekturnog dokumenta nisu implementirani. Promena jezika sama po sebi nije potrebna; bitno je da server postane autoritet za stanje i dozvole.

## Šta postoji

| Oblast | Implementirano | Status |
|---|---|---|
| Izgled | Boot animacija, CRT stil, terminal, mapa putanje, zaseban HRTOK kanal | Funkcionalan prototip; proveriti na stvarnim ekranima |
| Komande | help, status, sectors, hint, ls, cd, cat, display, auth, run, root, skriveni završeci | Osnovni skup radi; dokumentacija i sintaksa nisu usaglašene |
| Prva faza | Medical: komora + datum manual override-a | Implementirano |
| Druga faza | Communications: paket + vreme blokade | Implementirano |
| Treća faza | Cortex Echo, tastaturni izazov sa 20 signala i pragom 15 pogodaka | Implementirano; uspeh u UI nije u ovom pregledu odigran |
| Navigacija | Orbitalni planer, do dva manevarska čvora, budžet 600 delta-v, držanje Enter | Implementirano; numerički pronađena rešenja |
| Tajmeri | Misija 15 min, sedacija 5 min, pauza misije u planeru | Implementirano |
| Završeci | Earth, shutdown, transfer; neuspeh zbog sedacije ili isteka misije | Postoje handleri i ekrani; nisu svi UI putevi odigrani |
| Sun izbor | Tekst i ekran za dobrovoljnu karantinsku odluku | Nema povezanog normalnog komandnog puta |
| AI | Personality/lore/response-contract fajlovi, Responses API adapter, rezervne replike | Delimično; pravi model nije potvrđen u ovom pokretanju |
| Mediji | Pregledač slike/videa/zvuka, 19 WAV efekata, boot MP3 i GIF | Deo integrisan |
| Reset | Posle kraja 60 s; nakon 5 min neaktivnosti reload | Implementirano, bez trajnog beleženja sesija |
| Administracija | Skriveni razvojni meni | Nije stvarna administratorska zaštita |
| Periferije | Nema adaptera za kameru, Arduino ili sinhronizovane TV izlaze | Nedostaje |

## Kritične prepreke za izložbu

### 1. Zaštita je uglavnom u pregledaču

`game-engine.js` čuva stanje, šifre, nivo pristupa i ishode u klijentu. `commands.js` tamo proverava pristup. Server ne zna trenutnu sesiju niti nivo dozvole.

Potvrđeno HTTP proverom bez prijave: `/api/files`, `/game-engine.js`, `/central-ai.js`, `/ai/captain_lore.txt`, zaključani Communications zapis i Command neural-transfer zapis vraćaju 200. To omogućava čitanje skrivenog sadržaja mimo igre. Ne znači da je time dokazan pristup celom operativnom sistemu.

Server služi širok statički koren `terminal-sketch/`. Postoji ograničenje putanje na taj koren, što je korisno, ali unutar njega nisu izdvojeni privatni fajlovi. Ako bi se koristio podržani `terminal-sketch/.env`, takav fajl bi po trenutnom rutiranju mogao biti poslužen kao statički sadržaj. Nije pronađen/pročitan stvarni ključ niti je tvrđeno da je ključ već procureo.

Potrebno: privatni serverski direktorijumi, dozvoljena lista javnih resursa, serverske sesije i dozvole, serverom potvrđeni izazovi i završeci. API ključ i administratorski pristup moraju biti van AI konteksta i javnih fajlova.

### 2. Razvojni režim je uključen

`app.js:68`: `DEV_MODE = true`. UI provera potvrđuje da komanda `dev` otvara meni koji zaobilazi uslove priče. Cortex test ne dodeljuje napredak, ali razvojni orbitalni planer koristi isti završni tok koji potvrđuje Earth transfer; nema ekvivalentnog odvajanja rezultata testa. Poslednje je nalaz iz koda, ne odigran UI dokaz pobede.

Potrebno: zaseban razvojni režim, nedostupan izložbenom igraču; test mini-igre ne sme nikada da dodeli pobedu ili fizičku nagradu.

### 3. Nema zaključane postavke uređaja

U repozitorijumu nema konfiguracije kiosk naloga, zaštićenog administratorskog izlaza, servisa za automatsko pokretanje/oporavak ili pravila za fizički i mrežni pristup. `server.listen(port)` ne ograničava eksplicitno interfejs na localhost; stvarna dostupnost sa mreže zavisi i od sistema/firewall-a i ovde nije proverena sa drugog uređaja.

Potrebno na ciljnom uređaju: ograničen nalog, kiosk/shell konfiguracija, odvojena administracija, nadzor procesa, kontrolisan pristup priključcima i oporavak posle prekida napajanja. Šifre iz priče nikada ne daju stvarna sistemska prava. Apsolutna zaštita od svih napada i fizičkog isključivanja nije obećanje koje se može dati.

### 4. AI API nema kontrolu opterećenja ni pouzdanu granicu čekanja

Nema autentifikovane sesije, ograničavanja učestalosti poziva, reda poruka ili eksplicitnog timeout/AbortSignal-a za poziv modela. Više poruka i događaja može istovremeno pokrenuti pozive i vratiti odgovore van redosleda. Rezervni tekst postoji, ali kod zaglavljenog zahteva nema kratkog garantovanog prelaska na njega.

Potrebno: validacija ulaza, limit dužine poruke, ograničenje paralelnih poziva i troška, timeout, uredno rukovanje greškama i odbacivanje zastarelih odgovora. Opšte greške server trenutno prikazuje kao 404.

## AI ličnost: šta stvarno nedostaje

- `centralApplyDeltas` samo prikazuje TRUST/SUSPICION oznake. Ne sabira ih u stanje i ne menja ponašanje igre.
- `forceParanoidDeltas` za svaku poruku/događaj forsira pad poverenja i rast sumnje. Nema stvarnog puta kojim strpljenje, dokaz ili saradnja popravljaju odnos.
- Model dobija do poslednjih osam unosa istorije; nema sažetka, trajnih činjenica, obećanja, protivrečnosti i strukturisanog znanja igrača.
- Ceo kratki lore seed sa označenim zabranjenim istinama šalje se i za Access 0. Zaštita tajni počiva na tekstualnoj instrukciji.
- Modelov mood/intent nije strogo validiran; u kontrolisanom mock testu prihvaćeni su `INVALID_MOOD`, `INVALID_INTENT` i delte -999/+999. To trenutno ne menja dozvole, ali nije spremno za budući sistem posledica.
- AI događaji se zaključuju iz teksta pokušane komande. Npr. neuspešan `auth medical` može izazvati repliku koja govori kao da je pristup uspešno dobijen. Čitanje se prati kao jedan opšti događaj, a ne kao konkretan dokaz.
- Pripremljena početna AI replika postoji u backend-u, ali start igre je ne poziva. U UI je HRTOK kanal na početku prazan.
- Ostaje i stari `anomaly` kanal sa zasebnim jednostavnim replikama, što treba usaglasiti.

Za uverljiv lik treba povezati stabilnu biografiju, emocionalno stanje i odnos sa stvarnim ishodima poteza. Svaki dokaz mora imati pravilo otkrivanja i odobrene verzije odgovora. Prompt je dobra autorska osnova, ali sam nije simulacija ličnosti.

## Tok igre i lore

Dokumentovani tok je Medical → Communications → fragmenti Command/Engineering/Hibernation. Kod koristi Medical → Communications → Cortex Echo, pa ROOT i orbitalni planer. To je dizajnerska odluka koju treba usaglasiti pre proširivanja sadržaja.

Predlog: zadržati tri glavne faze, a svakoj dodati nekoliko smislenih interakcija. Treća može objediniti dokaze o kapetanu, Cortex i završnu navigaciju, ali ne treba automatski vraćati sve stare zagonetke.

Konkretne praznine:

- U `content/` ima 18 tekstualnih zapisa, dve `.app` stavke i dve slike. Botany i Food sektori nisu razrađeni u igriv sadržaj.
- Engineering tekst pominje Command/Medical/Communications kao uslove, a kod traži Medical/Comms/Cortex.
- Kod koristi misiju od 15 minuta; noviji gameplay cilja oko 10 minuta. Boravak u planeru pauzira misiju, pa 15 minuta nije maksimalno trajanje partije.
- `hint` ima jednu statičku poruku po fazi; nema dokumentovana tri nivoa pomoći.
- Komande iz dokumentacije `open`, `search`, `access`, `sudo`, `comms send distress` nisu implementirane u tom obliku. Natural-language unos u KOSMOS ne izvršava namere; razgovor je u HRTOK kanalu.
- Dobrovoljni Sun završetak nije povezan. Gašenje AI-ja završava sesiju iako tekst kaže da preostali izbori ostaju igraču. Treba definisati da li je to kraj ili sekundarni izbor uz kurs.
- Nakon Earth transfera brzo sledi završni ekran i reset; dokumentovano post-ROOT/post-ending istraživanje nije završeno u zamišljenom obliku.
- Rotacija Cortex šifre postoji u klasi, ali normalni reset radi reload i kreira novu klasu od početka; nema trajne rotacije između posetilaca.
- Nema potpunog sistema replay varijanti niti pouzdane detekcije znanja iz prethodne partije.

## Mediji i fizička instalacija

U repozitorijumu postoje dva MP4 fajla u YSP folderu. Trenutni `content/` indeks nema video/audio zapise za lore; prikaz medija podržava taj format, ali snimljene scene nisu time automatski povezane sa pričom. Potreban je manifest: snimak, lik/sektor, uslov pokretanja, titl, ekran, trajanje i pravilo ponovnog puštanja.

Nema koda za kameru, serijsku komunikaciju/Arduino, GPIO, sinhronizaciju više ekrana, heartbeat periferija ili potvrdu izvršene komande. Komentar o fizičkoj nagradi nije hardverska integracija.

Pre implementacije treba zapisati šta znači SISI, ciljnu platformu/OS, modele i broj ekrana/kamera/ploča, veze i tačne fizičke radnje. Običan TV može prikazivati postojeću aplikaciju kao monitor; to ne potvrđuje traženu integraciju cele postavke.

## Šta je provereno

- Node server se pokreće; početni ekran učitava arhivu.
- UI: boot, Medical Access 1, Comms Access 2, sedacija, pokretanje Cortex izazova, neuspeh i povratak u terminal, otvoren razvojni meni.
- 16 izolovanih provera game-engine ponašanja: zaključavanja, pogrešne i ponovljene šifre, ROOT uslovi, sedacija, reset, pauza/nastavak misije i Earth potvrda.
- Dodatna provera reprodukuje odsustvo Sun komandnog puta.
- HTTP provere potvrđuju dostupnost stranice i nezaštićenih ruta. Njihov uspeh je potvrda nalaza, a ne potvrda bezbednosti.
- `/api/central` vraća `source: local`. Pravi online model i kvalitet njegovog razgovora nisu potvrđeni.
- Mock AI test potvrđuje slabu validaciju izlaza, odsustvo eksplicitnog timeout signala i uključivanje zabranjenog lore-a pri Access 0; nije koristio stvarni API.
- Numerička pretraga orbitalnog planera pronalazi Earth rešenja za početni napredak 0%, 33%, 60% i 80%. Ovo ne dokazuje ljudsku težinu, fizičku realističnost simulacije niti kompletnu UI putanju.
- Sintaksne provere app.js, server.js i central-ai.js prolaze.

Nisu provereni: kompletan ljudski prolaz svih završetaka, uspešan Cortex UI prolaz, pravi API, višesatni rad, ciljna Pi/TV oprema, prekid napajanja, stvarna kamera/Arduino i mrežni pristup sa druge mašine. U repo-u pre ovog pregleda nije bilo automatizovanog test paketa ili CI konfiguracije.

## Prioriteti i procena rada

Procene su inženjerski rasponi u fokusiranim čovek-danima, ne garantovan rok. Integracija hardvera ostaje najveća nepoznanica.

| Paket | Procena | Uslov završetka |
|---|---:|---|
| Zaključati scenario, završetke i manifest opreme/snimaka | 0,5–1 | Jedna usaglašena specifikacija |
| Serversko stanje, javni/privatni fajlovi i API zaštita | 2–4 | Nema zaobilaženja testiranih dozvola direktnim zahtevom |
| Stvarna AI memorija, odnos, lore pravila i fallback | 2–4 | Reakcije odgovaraju dokazima; tajne i dozvole kontrolisane |
| Tri faze, hintovi, završeci i sadržaj | 2–4 | Svaki glavni put može da se završi bez pogađanja |
| Kiosk, administracija, startup i oporavak | 1–2 | Potvrđeno na ciljnom uređaju |
| Snimci i fizička integracija | 1–3+ | Potvrđeno na stvarnoj opremi |
| Regresija, probni igrači i duga proba | 2–3 | Dokumentovani prolazi i rešeni blokatori |

Ukupno okvirno 10,5–21+ čovek-dana za opisani obim, uz preklapanje rada kada više ljudi rade nezavisne poslove. To nije realno obećanje da jedna osoba garantovano završava sve do 18. septembra.

Za rok 18. septembra: 9–10. specifikacija i blokatori; 11–13. kompletan glavni put + serverska zaštita + AI stanje; 14–15. zaključavanje sadržaja i prava oprema; 16–17. probe i samo ispravke; 18. instalacija i provera. Ako ključni blokatori ostanu 13. septembra, smanjiti opcione sektore i grane, uz zadržavanje bezbednosti i kompletnog glavnog puta.

## Šta znači spremno za predaju

- Svi dogovoreni završeci i tri faze imaju prolazne funkcionalne i regresione testove.
- Nema preostalih kritičnih problema sa izlaskom, stvarnim administratorskim pravima, privatnim fajlovima ili promenom napretka mimo pravila u dogovorenom modelu pretnji.
- Razvojni alati su uklonjeni iz izložbene verzije; prava administracija radi samo ovlašćenima.
- Najmanje 30 zabeleženih celih partija različitim stilovima, uz ponavljanje relevantnih testova nakon izmena; broj je cilj, ne dokaz kvaliteta sam po sebi.
- Višesatna proba na stvarnoj opremi, ponovljeni reset, gubitak interneta/API-ja i odvajanje periferije imaju poznat, prihvatljiv ishod.
- Snimci, titlovi, lore i AI rečenice odgovaraju istom kanonu i vremenskom budžetu.
- Postoji verzionisana rezervna kopija instalacije, uputstvo za organizatore i proveren postupak vraćanja u rad.
