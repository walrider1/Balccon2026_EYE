# Provera kompletnosti — 11. septembar 2026.

Ovaj pregled zamenjuje ranije okvirne procente. Osnova su postojeći kod, četiri DOCX projektna dokumenta i aktuelne provere. Izmene su lokalne na codex/hrtok-ai; nisu pushovane.

## Potvrđeno u softveru

- Glavni put: Medical → Comms → Cortex → ROOT → završni izbor; opciona dvominutna CTF istraga.
- Server proverava pristup arhivi, šifre, Cortex rezultat i orbitalni manevar. Model ne upravlja dozvolama ili operativnim sistemom.
- Lokalno čuvanje aktivne igre; reset; administratorska prijava, nova partija i zaustavljanje servera.
- AI rezervne replike, ograničenja poziva, validacija odgovora i odvojena memorija po sesiji.
- Najnovije ispravke: rollback na poslednje sačuvano stanje pri neuspešnom upisu; računanje završetka od stvarnog roka; odbijanje planera kada više nema mesta za čvor; vidljive poruke planera; držanje Enter-a bez oslanjanja na keyboard repeat; prekid držanja pri gubitku fokusa; strimovanje i HTTP byte ranges za medije.

Aktuelne provere: 55 automatskih testova prolazi; 70 HTTP provera prolazi; 30/30 statički navedenih lokalnih resursa postoji. Testovi uključuju administraciju na zasebnom serveru, neuspešan upis, reset, rokove, završetke i audio range zahteve. Ranije su u browseru prošli Cortex, ROOT, CTF, Earth capture prikaz, reload, Sun završetak i automatski reset. Ove provere nisu zamena za probu fizičke instalacije.

## Šta nedostaje za punu verziju prema dokumentima

| Oblast | Stvarno stanje | Potrebno za zatvaranje |
|---|---|---|
| Pravi AI | GPT-4.1 mini radi preko API-ja; četiri živa odgovora su prošla, uključujući srpski razgovor. Lokalni konzervativni budžet je 3 USD. | Rotirati ključ koji je podeljen u razgovoru; višekratna ljudska ocena ličnosti, pamćenja i otkrivanja činjenica. Četiri poruke nisu puna AI evaluacija. |
| Potpun lore | DOCX priča i sektori postoje u repozitorijumu, ali nisu svi događaji razloženi u dostupne tragove. Botany/Food nemaju svoju punu arhivu. | Povezati kanonske događaje sa konkretnim zapisima, uslovima pristupa i AI znanjem; odvojiti glavnu putanju od opcione istrage. |
| Snimci i događaji | Dostavljena dva ZIP-a s izrazima oka; NTSC varijanta ima VHS efekte. Dodati poseban eye.html ekran i režija vezana za serversko stanje. | Proba na fizičkom drugom televizoru; izrazi oka ne zamenjuju eventualne snimljene lore scene. Detalji i završne provere u EYE_MEDIA_INTEGRATION.md. |
| Replay | Nova sesija i nasumični Cortex kod postoje; glavne Medical/Comms zagonetke i raspored tragova ostaju isti. | Ako se zadržava puni plan iz dokumenata: seed varijante sporednih tragova/AI ciljeva i kontrolisana reakcija na prerano znanje igrača. |
| Trajna istorija | Aktivna igra je u JSON-u; AI razgovor je u RAM-u; reset uklanja prethodnu igru. | Sažeci završenih partija, statistika ishoda/trajanja i dijagnostika uz ograničenu retenciju; trajna AI memorija ako je potrebna posle restarta. SQLite je planiran, ali sama promena tehnologije nije cilj. |
| OS kiosk | Loopback server i zaštićen admin panel postoje. OS i browser nisu zaključani. | Namenski ograničen nalog, auto-start, kontrolisan izlaz, oporavak posle pada, rezervna SD slika i proba prečica/USB/ponovnog napajanja. |
| Administrator | Funkcionalnost je testirana, ali trajna šifra nije postavljena. | Lokalni setup-admin, prijava i proba operatera na instalaciji. |
| Hardver | Dokument arhitekture predviđa Raspberry Pi 4; nema implementirane integracije kamera/Arduino. | Potvrda OS-a, modela kamera/interfejsa i Arduino ploča/protokola; povezivanje TV izlaza i test stvarne opreme. Značenje „SISI“ ostaje nepotvrđeno. |
| Balans i prihvatno testiranje | Automatizovane i deo browser proba prolaze. | Više novih igrača, sva četiri dobrovoljna završetka i oba timeout ishoda, fizičko držanje Enter-a, prekidi interneta/servera/napajanja, vreme po partiji i rad više sati. |
| Isporuka | Sve dorade su još lokalne. | Pregledan commit/push, označena verzija i ponovljiva instalacija/rezervna kopija na ciljnom uređaju. |

## Razlika između starog tehničkog plana i sadašnjeg koda

DOCX arhitektura predviđa Python + SQLite, a kolegin postojeći projekat i nastavak koriste Node.js + lokalni JSON. Važan zahtev — server jedini menja stanje igre — sada je ispunjen. Nije potrebno prepisivati funkcionalan projekat u Python samo radi podudaranja naziva tehnologije; trajnost istorije i ponašanje pri grešci treba proveravati kao konkretne zahteve.

Dokumenti imaju različite ciljeve trajanja (kratak gameplay oko 10 minuta naspram starijeg šireg MVP plana). Trenutni kod koristi 15-minutnu misiju i 5-minutnu sedaciju, a planer pauzira misiju. Stvarno trajanje mora se izmeriti sa igračima pre događaja.

## Redosled do događaja

1. Zaključiti konačni lore i snimke iz postojećih dokumenata i finalnih materijala; postaviti lokalni AI ključ i administratorsku šifru.
2. Instalirati i zaključati Raspberry Pi postavku, dodati auto-start i proveriti izlaze/opremu.
3. Povezati medijske događaje i potrebne hardverske signale.
4. Provesti ljudske i višesatne probe; doraditi balans i AI prema zabeleženim problemima.
5. Sačuvati release u Git-u i napraviti proverenu rezervnu sliku instalacije.

Replay proširenje i statistiku treba uključiti ako je cilj puna dokumentovana verzija; za kraći izložbeni MVP mogu ostati odvojena naredna faza. To ne treba predstavljati kao već završenu funkcionalnost.

## Dopuna nakon povezivanja oka
Pravi AI je povezan, a NTSC snimci su integrisani u zaseban drugi ekran. Najnovije provere: 62 automatska testa, 70 HTTP provera igre, 27 video provera, 61/61 resursa. Za detalje pogledati EYE_MEDIA_INTEGRATION.md. Fizički televizori/Pi, OS kiosk, puna lore arhiva i ljudske višesatne probe i dalje nisu završeni.


## Najnovija dopuna — lore i istorija
Dodato sedam povezanih zapisa, Botany/Food sektori i kontrolisano AI znanje. Trajni sažeci poslednjih 500 partija i administratorska statistika su implementirani. Raniji redovi tabele o nedostatku ovih arhiva i istorije sada su istorijski. AI memorija razgovora ostaje u RAM-u, a nasumične replay varijante nisu dodate. Najnovije: 69 testova, 85 HTTP provera sa AI probom, 27 video provera. Detalji i ograničenja: LORE_HISTORY_IMPLEMENTATION.md.

