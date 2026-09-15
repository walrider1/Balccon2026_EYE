# AI oko i drugi ekran — 11. septembar 2026.

## Šta je u ZIP-ovima

`Eye export.zip` sadrži 27 MOV izvoza izraza oka. `ntsc.zip` sadrži 27 MOV klipova i `eyesetting.json`. NTSC primer je H.264 High 4:4:4, 1080×1080, progressive, 30000/1001 fps, uz AAC audio. Vizuelno poređenje istog Idle kadra potvrđuje dodati analogni/VHS šum. Naziv NTSC ne znači da su fajlovi aplikacija za kameru ili drajver za TV.

JSON je preset video efekta: composite noise, head switching, tracking noise, ringing, chroma noise i VHS parametri. Nije konfiguracija AI-ja, ne sadrži program koji treba izvršiti i nije automatski primenjen kao instrukcija. `__MACOSX`, `._*` i `.DS_Store` su pomoćni metapodaci, ne scene.

Uvoz: `python scripts/import-eye-media.py "D:/Arhiva-sa-C-2026-09-11/Downloads/Telegram Desktop/ntsc.zip"`. Potrebni su ffmpeg i ffprobe. Originali se ne menjaju. Browser kopije su tihi 720×720 H.264/yuv420p MP4 sa faststart, u `terminal-sketch/eye-media`; zadržan je kvadratni odnos bez rastezanja. Zvuk ostaje u glavnom terminalu. Manifest beleži izvor i trajanje svakog klipa. Konverzija je neophodna radi šire kompatibilnosti od originalnog 4:4:4 MOV-a; fizički Pi dekoder tek treba proveriti.

## Postavljanje dva ekrana

1. Prvi prozor: `http://localhost:5173/` — postojeća igra.
2. Drugi prozor istog browser profila: `http://localhost:5173/eye.html` — prevući na drugi TV, pritisnuti FULL SCREEN.
3. Oba prozora moraju koristiti isti host (`localhost`) i isti profil/cookie; nemoj mešati `127.0.0.1`, privatni profil ili drugi browser.

Ekran oka ne otvara novu partiju i ne produžava tajmere igrača. Čita samo odabrane vizuelne podatke preko `/api/eye`; ne prima kodove, tekst arhiva, lozinke ili ceo AI prompt. Restart/novi session cookie se otkriva sledećom proverom. Bez signala prelazi u standby. Nema dodatnih API troškova za animacije.

Ovo je postavka za drugi HDMI ekran istog računara. TV sa zasebnim browserom preko mreže nije podržan ovom vezom; loopback zaštita servera ostaje uključena. Fullscreen nije OS kiosk.

## Režija

| Stanje | Animacija |
|---|---|
| Nema aktivne partije | Sleep_standby |
| Početak nove partije | Awakening, pa Idle varijante |
| Čekanje AI odgovora ili novi pročitani zapis | Reading |
| AI postavlja pitanje / daje smernicu | Curious / Stivker_hint (originalni naziv) |
| Sumnjičav AI / neutralan odgovor | Squint_sus / Looking |
| Igrač povrati ROOT | Shocked |
| Manje od minut sedacije bez ROOT-a | Panic2 |
| Sun / shutdown | Death jednom, zadržan završni kadar |
| Earth / transfer | Long_blink jednom, zadržan završni kadar |
| Sedation / mission timeout | Sleep_standby |

Ostale varijante su uvezene kao raspoloživ materijal, ne ubacuju se nasumično: učestalo kolutanje očima ili bol bez događaja narušilo bi smisao lika. Animacije su vizuelna interpretacija stanja; model ne može sam menjati završetak ili dozvole.

## Preostale probe

Pregledana je stvarna reprodukcija standby oka u browseru. Automatizovani testovi pokrivaju početak/reset, isticanje čekanja, čitanje, rok sedacije i svih šest završnih stanja; HTTP provere pokrivaju odvajanje sesija i privatnih podataka. Potrebno je ljudski oceniti prelaze, ritam i svaku animaciju u pokretu, potom testirati dva fizička ekrana, Pi opterećenje i višesatni rad. Trenutni prelazi menjaju klip direktno; nema obećanja neprimetnih filmskih prelaza između svakog para snimaka.

Tokom uvoza disk se napunio. Automatska kontrola je odbila uklanjanje privremenih izvoda iz `.runtime/media-source`; oni su ostali, a uvoz koristi postojeće kopije. Osloboditi prostor pre dužih proba, jer pun disk može sprečiti čuvanje partije i budžeta. Originalni ZIP-ovi nisu obrisani.

## Završna provera integracije

- 27/27 MP4 snimaka provereno ffprobe-om: H.264, yuv420p, 720×720, bez audio kanala; ukupno oko 94,7 MB.
- 62 automatska testa, 70 HTTP provera glavne igre, 27 provera video MIME/range isporuke i 61/61 navedenih lokalnih resursa prolaze.
- Browser: standby, aktivne Idle varijante i Stivker_hint posle HRTOK help odgovora potvrđeni kroz stvarnu reprodukciju (readyState 4, paused false). Svaki završetak je proveren u testovima režije, ne na fizičkom TV-u.
- Greška videa ostaje vidljiva i nakon uspešnog očitavanja stanja igre; ponovni pokušaj nakon 5 sekundi, a zaglavljeno početno učitavanje se oporavlja posle 10 sekundi. Zastarelo odbijanje prethodnog play zahteva ne prepisuje stanje novog klipa.
- Budući uvoz prvo pravi .partial.mp4 i tek po uspešnoj konverziji zamenjuje javni fajl. Nedovršeni video se ne objavljuje.
- Originalni ZIP-ovi su tokom čišćenja diska preseljeni u D:\Arhiva-sa-C-2026-09-11\Downloads\Telegram Desktop. Veliki izvučeni originali su u D:\Arhiva-sa-C-2026-09-11\EYE-source-media; radni MP4 ostaju uz projekat. Raniji problem punog diska je rešen.

Ponovljiva video provera: node scripts/check-eye.cjs.