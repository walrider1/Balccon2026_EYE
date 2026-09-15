# Dva ekrana — dopuna posle razgovora

Potvrđen ciljni sistem: Raspberry Pi OS / labwc.
Terminal i razgovor su na jednom ekranu; eye.html prikazuje samo oko i njegove reakcije na drugom.

## Urađeno lokalno

- Oba Chromium prozora dobijaju kiosk zastavicu i dele profil/cookie partije.
- Eye kiosk nema HTML dugme koje bi uvodilo drugi, izlazni fullscreen režim.
- Pripremljen user servis za ponovno pokretanje nakon prestanka browser procesa.
- Pripremljen generator labwc prečica i postupak administratorskog stop-a preko SSH-a.
- Ispravljena veza svih šest stvarnih HRTOK raspoloženja sa video reakcijama.
- Promenjene lokalne replike pozdrava, saradnje, straha i otvaranja arhive;
  prompt traži kraće, običnije reakcije, bez automatskog tutorijala.
- 73 testa prolaze. Bash sintaksa i generisani XML su provereni.
- Tri replike na srpskom uspešno su dobijene preko GPT-5.1; kvalitet lika još
  zahteva duži ljudski playtest, a poslednja dorada prompta nije ponovo slata API-ju.

## Još nije završeno na uređaju

Prozori nisu fizički raspoređeni ni zaključani na Pi-ju. Potrebni su izlazi
`wlr-randr`, `labwc --version` i `chromium --version` da se dovrši raspored.
Proveriti da oba prozora ostaju vidljiva i da obične tastaturne/mouse prečice ne izlaze iz kioska.
Servis oporavlja proces; zatvaranje jednog pojedinačnog prozora dok drugi ostane
otvoren još nema zaseban watchdog. To mora biti onemogućeno i provereno na Pi-ju.

Kompletni koraci i administratorski izlaz: [deploy/pi/KIOSK.md](deploy/pi/KIOSK.md).
Nisu menjana OS podešavanja ovog Windows računara i nije izvršen Git push.
