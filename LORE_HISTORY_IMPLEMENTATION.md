# Lore i istorija — 11. septembar 2026.

## Nova igriva arhiva

Sedam novih zapisa razrađuje postojeći master lore i dokument sa semenima sektora. To su autorske adaptacije u kratke arhive, ne doslovni citati iz DOCX dokumenata. Postojeće šifre i Medical → Comms → Cortex → ROOT tok nisu promenjeni.

| Zapis | Izvor i namena | Pristup |
|---|---|---|
| /botany/sector_log.txt | Sektor C: Slokijev odlazak u medicinu i raspad poverenja u dve grupe | 2 |
| /botany/sample_manifest.txt | Master lore: uzorak sa Marsa, botanika i kapetanova odluka o transportu | 2 |
| /food/quarantine_report.txt | Sektor E: lokalno uspešno ograničavanje uljeza, nepotvrđena potpuna sigurnost | 2 |
| /food/appeal.txt | Autorski oblik dileme iz sektorskog dokumenta: kakav dokaz bi Command prihvatio? Konačna sudbina nije izmišljena kao potvrđena | 2 |
| /medical/identity_limits.txt | Pravila kopija i nepouzdanost ponašanja kao testa; nije dokaz porekla sadašnjeg pacijenta | 0 |
| /command/crisis_review.txt | Kapetanova odgovornost za uzorak, osporena vlast i kontinuitet | 2 |
| /engineering/resource_dispute.txt | Sektor B: sukob oko resursa i nezavisnih ovlašćenja | 2 |

Novi sektori su vidljivi u komandi `sectors`; skraćene putanje `/botany` i `/food` rade kao ostale sektorske putanje. Unakrsne reference povezuju nove zapise sa postojećim Comms, neural, hibernation i engineering dokazima. Opciono istraživanje ne dodaje obavezne korake za pobedu.

Master lore se namerno ne izlaže ceo odjednom: identitet pacijenta i podaci koje likovi ne mogu dokazati ostaju neizvesni za igrača. Ovo nije nasumično generisanje novih kanonskih događaja niti implementacija svih budućih replay varijanti.

## AI provera

AI dobija nove činjenice samo iz pročitane serverski proverene arhive. Za prepoznata pitanja o nepročitanim Botany/Food/Comms/neural/pods dokazima koristi se autorski odgovor bez modelskog nagađanja. To nije univerzalna garancija protiv svake moguće halucinacije ili parafraze pitanja.

Prva živa proba je otkrila izmišljene detalje Botanike bez dokaza. Posle ispravke ponovljen je ceo put do ROOT-a i Earth završetka: odgovor pre dokaza ostao je lokalni; pitanja nakon dokaza i ROOT-a uspešno su koristila OpenAI. ROOT instrukcija eksplicitno zabranjuje izmišljanje novih obaveznih dozvola i medicinskih uslova. Duže ljudsko ocenjivanje lika ostaje potrebno.

## Trajna istorija

`game-sessions.json` sada koristi verziju 2: aktivne sesije i najviše 500 poslednjih sažetaka čuvaju se istim atomskim upisom. Stari format niza sesija se automatski čita i prelazi na novi pri sledećem upisu. Pre prelaska na lokalnom uređaju napravljena je kopija prethodnog fajla u `.runtime`.

Sažetak sadrži: slučajni ID partije (nije session cookie), početak/kraj, trajanje, ishod, dostignuti pristup, ROOT, broj pročitanih zapisa, broj smernica i CTF uspeh. Ne čuva tekst razgovora, API ključ ili kodove zagonetki. Prosek uključuje sve zadržane ishode, uključujući prekide; nije doživotna statistika posle brisanja najstarijih zapisa.

Završetak se upisuje jednom. Reset aktivne započete partije beleži `abandoned`; nekorišćen boot se ne beleži. Sesije uklonjene zbog isteka mogu imati `expired`. Stari završeni zapisi se čuvaju pri kasnijem uklanjanju sesije. Ako upis ne uspe, stanje i istorija vraćaju se zajedno na poslednje sačuvano stanje.

Pregled je samo u administratorskom statusu: broj sažetaka, ishodi, prosečno trajanje i 20 poslednjih partija. AI razgovorna memorija i dalje je u RAM-u; sažeci partija nisu trajna memorija AI dijaloga.

## Provere

- 69 automatskih testova: uključuju migraciju, restart, reset, deduplikaciju, limit od 500 sažetaka, rollback pri grešci diska, privatnost i lore pristup.
- 85 HTTP provera sa `node scripts/check-http.cjs --live-ai`; ova opcija šalje plaćene AI probne poruke. Bez opcije nema novih živih AI razgovora.
- 27 video-provera i 61/61 navedenih resursa.
- U stvarnom lokalnom fajlu potvrđene dve završene Earth test-partije posle ove izmene.

Preostalo za fizičku isporuku: administratorska šifra, Pi/kiosk/hardver, ljudske probe svih ishoda, duži rad i kontrolisan release. Nasumične replay varijante nisu deo ove izmene.
