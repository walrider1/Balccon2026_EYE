# Napredak igre — 10. septembar 2026.

Aktuelna iteracija: 49 testova, 70 HTTP provera i browser ciklus do završetka i automatske nove partije. Najnovije dopune su u odeljku „Nastavak: glavni tok i administracija“.

Grana: `codex/hrtok-ai`. Izmene su lokalne; nisu commitovane ili pushovane.
Ovo je nastavak AI faze. Raniji STATUS i audit predstavljaju istorijski pregled.

## Implementirano u ovoj fazi

- Server određuje pristup, ROOT delove, tajmere i završetke. Browser šalje zahteve umesto da sam sebi dodeljuje prava.
- Zaključani arhivski sadržaj proverava se i pri direktnom HTTP zahtevu, uključujući drugačiju veličinu slova na Windowsu.
- Serverski izvori i tajne nisu javni statički fajlovi. Server sluša samo na 127.0.0.1 i proverava Host/Origin.
- HttpOnly/SameSite sesija i trajno čuvanje napretka u ignorisanom `.runtime/game-sessions.json`. Osvežavanje ne vraća tajmere na početak. Restart servera zadržava igru; AI razgovor ostaje samo u memoriji.
- Cortex ostaje 20 signala / najmanje 15 pogodaka, sa istim ekranom i tasterima. Server sada bira signal, proverava rok i jednokratni token i izdaje nasumičan kod nakon uspeha. Nema klijentskog izdavanja koda.
- Orbitalna fizika izdvojena je iz postojećeg koda u zajednički modul. Server proverava najviše dva čvora, budžet 600 m/s, redosled, stvarni Earth capture i minimalno zadržavanje pre potvrde. Pauza misije u planer-u ostaje deo originalnih pravila.
- Opciono `ctf`: dva minuta za tri nova forenzička fragmenta, `flag EYE{...}` i ponovni pokušaj nakon isteka. Ne zamenjuje postojeće mini-igre. `status` prikazuje preostalo vreme.
- `hint` daje do tri nivoa pomoći po fazi. `course sun confirm` omogućava dobrovoljni quarantine završetak posle ROOT-a. Ostali završeci proveravaju potrebne uslove.
- AI dobija stvarno serversko stanje i proverene događaje. Lažirani access/ROOT u AI zahtevu ne otključava lore.
- Developer launcher je isključen. Postojeći CSS, medicinska i komunikaciona zagonetka i stari sadržaj nisu prepisivani.

## Provera

`node --test tests/*.test.cjs`: 35 testova, uključujući postojeće AI i game regresije.
`node scripts/check-http.cjs`: 70 HTTP provera, uključujući kompletan prolaz Medical → Comms → Cortex → ROOT → orbitalni manevar → Earth završetak.
Tri uzastopna HTTP prolaza služe proveri ponovljivosti posle poslednjih serverskih izmena.
Browser: boot, početna HRTOK replika, Medical i Comms autorizacija, sedacioni HUD, Cortex signali i povratak u terminal nakon neuspeha.
Ceo pobednički prolaz je proveren preko HTTP-a; kompletan ručni pobednički prolaz na fizičkom uređaju još nije urađen.

Tokom prve proširene probe pojavio se jedan generički 404 na serverskoj akciji; prvobitni uzrok nije sačuvan u logu. Dodata je bezbedna dijagnostika serverskih grešaka i kratko ponavljanje zapisa pri prolaznom Windows zaključavanju fajla. Ne tvrditi da je prvobitni uzrok dokazan. Ako se ponovi, log sada razlikuje problem skladišta od ostalih grešaka.

## Preostalo za konvencijsku instalaciju

- OS kiosk i administrator: ograničen nalog, kontrolisan izlaz/restart, ponašanje posle pada i ponovnog uključenja. Ova web aplikacija sama ne zaključava Windows/Raspberry Pi niti onemogućava fizičko gašenje.
- Potvrda ciljnog uređaja/OS-a i značenja „SISI”; povezivanje i testiranje kamere, televizora i Arduino ploča.
- Drive lore i snimci: preuzimanje odobrenih materijala, mapiranje na događaje i završetke, provera prava pristupa i reprodukcije.
- Pravi API ključ, provera dostupnog modela i ljudska procena prirodnosti HRTOK razgovora.
- Ručne ponovljene probe sa više igrača: trajanje, razumljivost hintova, svi završeci i reset.

Serverska validacija nije zaštita od osobe sa administratorskim pristupom računaru. Novi browser profil/kolačić može da otvori novu sesiju, a automatizovani klijent može da odgovara na vidljive Cortex signale; zaštita fizičkog terminala zahteva kiosk postavku. Čuvanje je lokalni JSON za jednu serversku instancu, ne distribuirana baza. Ne pokretati dve instance nad istim skladištem.

## Nastavak: glavni tok i administracija

Završena je nova softverska iteracija:
- `objective` i `status` prate tri faze; hint nakon Cortexa pokazuje izdati kod, a nakon tri potvrđena dela upućuje na ROOT.
- Sektorske putanje `/medical`, `/comms` itd. i `~/` sada rade iz bilo kog direktorijuma.
- `last_watch.txt` i `miras_flight_notebook.txt` čuvaju lične dileme i iskustva navigatorke; ne nabrajaju završetke.
- Cortex ponovo otvoren tokom aktivnog pokušaja nastavlja serverov signal i rezultat.
- Earth transfer postaje nepovratan i završava se na serveru i pri izgubljenom odgovoru browseru.
- Popravljeni su asinhroni prelazi, dvostruke komande, kasni Cortex callback, redosled ispisa i ponovno povezivanje/reset.
- Reset radi i kada je popunjen dozvoljeni broj sesija. Admin reset prepoznaju drugi tabovi istog profila.
- Zaštićen administratorski panel: scrypt hash, bez početne šifre, ograničenje pokušaja, 10-minutna prijava, odjava, nova partija i zaustavljanje servera.
- Dodate su lokalna provera resursa i uputstvo `OPERATOR_GUIDE.md`.

Aktuelno: 49 automatskih testova prolazi, kao i 70 HTTP provera kompletnog prolaza. Preflight potvrđuje 30/30 navedenih lokalnih resursa. Admin reset/stop su testirani na zasebnom privremenom serveru. Trajna administratorska šifra i AI ključ još nisu postavljeni.

I dalje ostaju OS kiosk, stvarni hardver, Drive materijali i ljudsko testiranje sa pravim AI modelom. Administratorski panel je završen kao kontrola aplikacije; nije zamena za zaključavanje celog uređaja.

Browser provera nove iteracije: sektorske putanje; faza 1 → 2; uspešan Cortex preko prikazanih tastera; hint sa izdatim kodom; ROOT; svi CTF fragmenti i prihvaćena zastavica; orbitalni planer sa stvarnim Earth capture proračunom; ESC; reload sa sačuvanim ROOT/CTF i preostalim vremenom; Sun završetak; automatski reset posle 60 sekundi. Nema zabeleženih browser JavaScript grešaka u proveravanom toku. Fizičko zadržavanje Enter-a do Earth završetka ostaje stavka probe na ciljnoj tastaturi; serverska potvrda i Earth završetak provereni su HTTP testom. Admin ulaz prikazuje samo prijavu bez dozvole.

## Provera 11. septembra

Aktuelno: 55 testova, 70 HTTP provera, 30/30 resursa. Dodati su rollback pri neuspelom čuvanju, ispravni rokovi posle offline intervala, zatvaranje prekasnog manevarskog prozora, vidljive poruke planera, držanje Enter-a bez keyboard repeat zavisnosti i strimovanje medija sa byte-range/HEAD podrškom. Puni pregled nedostajućeg obima je u STATUS_PROJEKTA_2026-09-11.md.
