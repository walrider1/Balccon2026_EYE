# Prvi prolaz — sva rešenja (spoileri)

## Pokretanje i ekrani

U folderu projekta: `git pull --ff-only`, zatim `node server.js`.
Ako server već radi, zaustavi taj proces sa Ctrl+C pa ga pokreni ponovo.
Običan monitor: `http://localhost:5173/` — KOSMOS levo, HRTOK i putanja desno.
CRT: `http://localhost:5173/eye.html` u drugom prozoru ISTOG browser profila.
Ne koristiti incognito niti mešati localhost i 127.0.0.1.

Za novu partiju koristiti /admin.html i administratorsko resetovanje.
Reload ne resetuje postojeću partiju ni tajmere.

## Najkraći kompletan prolaz — SILENT BRIDGE

Komande ispod unosi pojedinačno, uz Enter, u KOSMOS, ne u AI razgovor.
Na početnom ekranu unesi:

```text
start system
```

### 1. Medical

Za čitanje tragova (opciono ako samo testiraš prolaz):

```text
cat /medical/doctor_note.txt
cat /medical/recovery_service.txt
cat /medical/patient_intake.txt
cat /medical/medbay_audit.txt
```

Tačno rešenje — komora 07 i ručna intervencija 12. aprila:

```text
auth medical MR-07-0412
```

### 2. Communications

Tragovi:

```text
cat /comms/crew_announcement.txt
cat /comms/raw_uplink_ledger.txt
cat /comms/lock_audit.txt
```

Tačno rešenje — paket 184, blokiran u 23:17:

```text
auth comms F-184-2317
```

Ovo pokreće petominutnu sedaciju. Odmah nastavi na Cortex.

### 3. Cortex i ROOT

```text
run /medical/cortex_echo.app
```

Pritiskaj prikazano slovo A, S, K ili L dok je signal aktivan.
Potrebno je najmanje 15 pogodaka od 20, u roku od 40 sekundi.
Ne pritiskaj nasumično više tastera. Ako ne uspeš, ponovi run dok sedacija traje.

Po uspehu ekran izdaje kod `CORTEX-...`. Prepiši BAŠ taj kod:

```text
auth cortex CORTEX-KOD_KOJI_SI_DOBIO
root recover
```

`CORTEX-KOD_KOJI_SI_DOBIO` je oznaka mesta za stvarni kod, nije važeći kod.
ROOT zaustavlja sedaciju. Glavni tajmer misije nastavlja da radi.

### 4. Završetak

```text
central shutdown
```

To završava priču kao **SILENT BRIDGE**; ne zaustavlja Node server.
Sačekaj završni ekran. Time si završio jednu celu partiju.

## Drugi završeci — izaberi jedan umesto central shutdown

- **QUARANTINE:** posle ROOT-a unesi `course sun confirm`.
- **CONTINUITY ERROR:** prvo `cat /command/neural_transfer.txt`, zatim
  `neural transfer --source sloki --target central-ai`.
- **RETURN VECTOR:** posle ROOT-a pročitaj `cat /command/navigation/decision_brief.txt`
  i pokreni `run /command/navigation/orbital_burn_planner.app`.
  A/D pomeraju vreme čvora, W/S menjaju delta-v, levo/desno pravac,
  Enter postavlja/bira čvor, 1/2 biraju čvorove, Backspace briše, R resetuje.
  Napravi putanju koja ulazi u Zemljin prsten, zatim drži Enter za izvršenje.
  Konkretne vrednosti zavise od trenutka ulaska u planer; nema jednog fiksnog koda.
  Misija je pauzirana u planeru, Escape ga zatvara i nastavlja tajmer.

## Prečice

- Ctrl+Right: razgovor sa HRTOK-om; Ctrl+Left: KOSMOS.
- Tab u KOSMOS unosu dopunjava komandu; Shift+Tab menja kanal.
- PageUp/PageDown: skrol aktivnog kanala.
- Desni Ctrl: beleške.
- `status`, `objective`, `hint`, `help`: stanje, cilj, pomoć, komande.

Nema potrebe za razgovorom sa AI-jem da bi kodovi radili. Za test ličnosti
slobodno razgovaraj između faza, ali tajmeri nastavljaju da teku.
