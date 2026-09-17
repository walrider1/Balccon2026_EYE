# Uputstvo za prolazak (spoileri)

Pokreni `node server.js`, otvori http://localhost:5173/ i unesi `start system`.
Ako server već radi, restartuj ga nakon izmene fajlova. Reload ne resetuje partiju.
Kodovi Medical i Comms generišu se za svaku partiju; stari primeri nisu rešenja.

## 1. Medical — karton i potpisana intervencija

```text
cat /medical/doctor_note.txt
cat /medical/recovery_service.txt
cat /medical/patient_intake.txt
cat /medical/medbay_audit.txt
```

Iz patient_intake uzmi potvrđeni REGENERATION CHAMBER. Iz medbay_audit uzmi datum
potpisanog MANUAL OVERRIDE. Datum je MM/DD; ukloni kosu crtu.
Sastavi `auth medical MR-<komora>-<MMDD>` sa stvarnim vrednostima, bez zagrada.
VOID označava poništen unos: crvena arhivska stavka nije ovlašćenje kontrolera.

Prihvaćen kod otvara Neural Link. Uskladi talas sa referencom i potvrdi parametre.
Tek uspešna verifikacija daje Access 1. Ako zatvoriš prozor:
`run /medical/neural_link.app`.

## 2. Comms — povezivanje dva registra

```text
cat /comms/evidence.txt
cat /comms/recovery_service.txt
cat /comms/raw_uplink_ledger.txt
cat /comms/lock_audit.txt
```

U raw_uplink_ledger pronađi DISTRESS PRIORITY: uzmi broj paketa i REQUEST oznaku.
U lock_audit pronađi BLOCKED red sa istom REQUEST oznakom i uzmi vreme blokade.
Vreme emitovanja obećanja o spasavanju i VOID predlog deblokade nisu vreme blokade.
Sastavi `auth comms F-<paket>-<HHMM>`; ukloni dvotačku iz vremena.

Otvara se prijemnik. Tasterima 1/2 biraj frekvenciju ili polarizaciju, strelicama
levo/desno podešavaj, a Shift koristi za fine korake. Pronađi signal, precizno
podesi frekvenciju i polarizaciju. Oba lock indikatora moraju biti najmanje 92%
neprekidno osam sekundi. Ponovno otvaranje: `run /comms/relay_patch.app`.
Uspeh daje Access 2 i pokreće petominutnu sedaciju.

## 3. Cortex access i ROOT

Cortex je dostupan dok traje sedacija, pre oporavka ROOT-a:

```text
run /medical/cortex_echo.app
```

Pritisni prikazano A, S, K ili L čim se pojavi. Ne čekaš da stigne do vertikalne
linije: odgovor se prihvata tokom aktivnog signala. Prvi signal traje 2,1 s,
a dvadeseti 0,865 s. Svaki naredni skraćuje prozor za 65 ms.
Prvi pritisnuti A/S/K/L završava taj signal; pogrešan taster ili propušten signal
računa se kao greška. Držanje tastera ne daje dodatne odgovore.

Potrebno je najmanje 15 pogodaka u 20 signala, unutar ukupno 60 sekundi.
Šesta greška prekida pokušaj jer prolaz više nije moguć. Ako ne uspeš,
ponovo pokreni aplikaciju dok sedacija još traje; pokušaj ne resetuje sedaciju.

Po završetku prepiši stvarni prikazani CORTEX kod:

```text
auth cortex CORTEX-KOD_KOJI_SI_DOBIO
root recover
```

Oznaka KOD_KOJI_SI_DOBIO nije doslovan kod. Kod je nasumičan za partiju.
`auth cortex` potvrđuje treći ROOT share; tek `root recover` spaja sva tri
(Medical, Comms, Cortex), zaustavlja sedaciju i otključava navigaciju.
Glavni tajmer misije nastavlja da radi.

### Gde je ovo u kodu

- `terminal-sketch/game-engine.js`: `canStartCortex`, `authorize`, `recoverRoot` — uslovi pristupa i ROOT shares.
- `terminal-sketch/game-service.js`: `cortexSignal`, akcije `cortex-start` i `cortex-answer` — nasumični tasteri, vreme, bodovanje i izdavanje koda.
- `terminal-sketch/app.js`: `cortexGame.handleKey` i `resolve` — unos i prikaz odgovora.

## Posle ROOT-a

- `course sun confirm`: ostani na solarnoj putanji.
- `cat /command/neural_transfer.txt`, zatim `neural transfer --source sloki --target central-ai`: prenos svesti.
- `cat /command/navigation/last_watch.txt`, zatim `run /command/navigation/orbital_burn_planner.app`: povratak na Zemlju kroz orbitalni planer.
- `central shutdown`: otvara sekvencu gašenja AI-ja; prati prikazane kontrole.

`status`, `objective`, `hint` i `help` pokazuju stanje i dostupne korake.

## Kontrole posle ROOT-a

Planer: A/D pomera vreme manevra, gore/dole menja potisak (W/S takođe radi),
levo/desno menja smer, Shift pravi manje korake. Enter postavlja/bira čvor dok
putanja nije potvrđena; 1/2 biraju postojeći čvor. Potvrđena putanja se naoružava
držanjem Enter, pa se odredište zasebno potvrđuje. Status na panelu prati podešavanje bez popup prekida. Završna potvrda
odredišta ostaje pre izvršenja manevra.

Gašenje: drži prikazano dole/gore dve sekunde. Ukupno ima osam linkova. Posle prvih
sedam linkova Enter otvara sledeći korak. Esc zatvara panel. Poslednji link trajno
gasi HRTOK za tu partiju, ali ne završava navigaciju.
