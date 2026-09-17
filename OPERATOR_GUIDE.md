# EYE — uputstvo za operatera

## Pokretanje

Iz korena projekta, uz instaliran Node.js:

```powershell
node scripts/preflight.cjs
node terminal-sketch/server.js
```

Igra: http://localhost:5173

Otvori stranicu i unesi `start system`. `objective` pokazuje sledeći korak, `hint` daje postepenu pomoć, a `status` prikazuje tajmere i napredak.

## Tri faze

1. Medical: pročitaj zapise i obnovi prvi deo pristupa.
2. Comms: uporedi primarne dokaze i potvrdi blokiranu transmisiju.
3. Oporavak i odluka: Cortex → izdati kod → ROOT → odluka o završetku.

Cortex ima 20 signala, potrebno je najmanje 15 pogodaka. Nakon uspeha ne ponavljaj izazov: unesi izdati kod, pa `root recover`.
Komunikaciona autorizacija pokreće petominutnu sedaciju. Glavna misija traje 15 minuta; pauzira se dok je orbitalni planer otvoren. ESC zatvara planer i nastavlja misiju.
Opciono `ctf` otvara dvominutnu istragu, dostupnu posle Comms-a. Može da se radi i posle ROOT-a. Ne zaustavlja glavne tajmere. `status` prikazuje preostalo vreme; posle isteka `ctf` pokreće novi pokušaj.

Lični zapis poslednje straže dostupan je posle ROOT-a: `cat /command/navigation/last_watch.txt`. Neural opcija zahteva čitanje odgovarajućeg Command zapisa.

## Administrator

Jednokratno, u interaktivnom lokalnom terminalu:

```powershell
node scripts/setup-admin.cjs
```

Unesi svoju šifru od 12–200 znakova dva puta. Unos je sakriven; čuva se samo nasoljen scrypt hash u `.runtime/admin.json`. Nemoj slati šifru u razgovor ili GitHub. Nema podrazumevane šifre.

Panel: http://localhost:5173/admin.html

Prijava traje 10 minuta. Panel omogućava status, prekid trenutne partije i novu partiju u istom browser profilu, odjavu i zaustavljanje lokalnog servera. Nova partija i zaustavljanje imaju posebnu potvrdu u panelu. Zaustavljanje čuva već zabeležen napredak; ponovno pokretanje je istom `node` komandom.
Otvoren igrački tab u istom browser profilu prepoznaje novu partiju i osvežava se. Koristi isti naziv hosta (`localhost`, ne mešati sa `127.0.0.1`) za igru i panel.

Ako je šifra izgubljena: zaustavi server i lokalno premesti `.runtime/admin.json` na bezbedno mesto kao rezervu, pa ponovi setup. Restart poništava stare administratorske prijave.

Ovaj panel ne zaključava operativni sistem i ne sprečava fizičko gašenje računara. Za uređaj na događaju i dalje treba namenski kiosk nalog i OS konfiguracija. Igrački `central shutdown` odvaja HRTOK-ove linkove; navigacija ostaje dostupna. Zaustavljanje stvarnog servera je administratorska kontrola.

## Čuvanje, prekidi i sledeći igrač

Napredak se čuva u `.runtime/game-sessions.json`. Koristi jednu serversku instancu po skladištu. Folder nije deo Git-a.
Osvežavanje browsera i restart servera zadržavaju napredak i rokove. AI razgovor je trenutno u RAM-u i ne preživljava restart servera.
Posle završetka nova partija se otvara automatski nakon 60 sekundi. Pet minuta bez aktivnosti vraća aktivnu partiju na početak. Reset pri prekidu veze ponavlja povezivanje; igrač ne dobija novu sesiju samo zbog neuspelog HTTP zahteva.
Ako disk nije dostupan, server javlja `SESSION STORAGE UNAVAILABLE`. Pre dalje upotrebe proveri slobodan prostor/dozvole i lokalnu sinhronizaciju foldera. Za događaj je poželjna lokalna instalacija van OneDrive sinhronizacije.

## Provera pre događaja

```powershell
node --test tests/*.test.cjs
node scripts/check-http.cjs
node scripts/preflight.cjs
node scripts/check-ai.cjs
```

HTTP skripta pravi posebnu probnu partiju; ne koristi kolačić igrača. Admin HTTP test pokreće zaseban privremeni server i ne zaustavlja glavni server.
`node scripts/check-ai.cjs --live` šalje jednu stvarnu probnu AI poruku ako je ključ podešen. API ključ se unosi u lokalni `.env`.

Ručna proba na ciljnom uređaju: svaki završetak; Cortex neuspeh i ponovni pokušaj; planer ESC/povratak/zadržavanje Enter-a; CTF istek i ponovni pokušaj; kraj i automatska nova partija; prekid i povratak servera; zvuk/slika na stvarnom izlazu. Zabeleži trajanje i mesta na kojima se novi igrač zbunio.

## Drugi ekran — AI oko
Otvoriti http://localhost:5173/eye.html u drugom prozoru istog browser profila kao igra, premestiti prozor na drugi ekran i pritisnuti FULL SCREEN. Oba prozora koriste localhost. Oko prati partiju bez dodatnih API poziva. Detalji: EYE_MEDIA_INTEGRATION.md. Provera: node scripts/check-eye.cjs. Fullscreen nije zamena za OS kiosk.


## Istorija partija
Posle prijave na /admin.html klikni Osveži status. Prikazuje se najviše 20 poslednjih od 500 sačuvanih sažetaka, ishodi i prosečno trajanje. Reset zadržava sažetak prethodne započete partije; tekst razgovora se ne arhivira. Backup .runtime/game-sessions.json sada obuhvata i istoriju. Detalji: LORE_HISTORY_IMPLEMENTATION.md.

