# EYE: Windows kiosk za dva prikaza

Obican F11 fullscreen nije zakljucavanje. Ne pokusavati da JavaScript blokira OS precice.
Ova uputstva nisu primenjena na razvojnom racunaru.

## Browser nivo (nije potpuno OS zakljucavanje)

Microsoft Edge digital-signage kiosk blokira F11 i F12. Za pojedinacnu probu, sa vec pokrenutim serverom:

```powershell
& "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:5173/?display=desktop" --edge-kiosk-type=fullscreen --no-first-run
```

Za oko URL je `http://localhost:5173/eye.html?kiosk=1`.
Samo pokretanje dva browser prozora ne garantuje raspored na dva monitora niti blokira OS izlaz.
Ne koristiti ove komande kao dokaz da Alt+Tab, Alt+F4 ili Windows taster vise ne rade.

## Namenska instalacija

Potreban je poseban ogranicen kiosk nalog i OS konfiguracija, uz zaseban administratorski pristup.
Za Windows: proveriti izdanje sistema i mogucnosti Assigned Access / Shell Launcher.
Jednostavan single-app wizard nije gotov recept za dva nezavisna prozora na dva monitora.
Dva izlaza zahtevaju proverenu konfiguraciju prozora, dozvoljenih aplikacija i prečica na ciljnom uredjaju.
Server mora raditi nezavisno od interaktivnog administratorskog terminala.

Prvo utvrditi da li su oba ekrana na istom racunaru. Ako oko koristi Raspberry Pi,
primenjuje se njegov namenski kiosk, uz reseno povezivanje sa serverom; Windows localhost nije Pi localhost.
Za dva ekrana na Pi-ju videti ../pi/KIOSK.md.

Na oba prikaza proveriti: F11, Escape, Alt+F4, Alt+Tab, Windows taster, Ctrl+L/T/N/W,
Ctrl+Shift+I i restart/pad aplikacije. Escape treba da zatvara dijalog igre, ne kiosk.
Administratorski izlaz mora ostati dostupan van kontrole igraca. Nema apsolutne zastite
od fizickog gasenja ili odvajanja kablova.

Izvori:
- https://learn.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode
- https://learn.microsoft.com/en-us/windows/configuration/assigned-access/recommendations
- https://learn.microsoft.com/en-us/windows/configuration/kiosk/
