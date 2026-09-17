# EYE — priprema Raspberry Pi instalacije

Status: skripte pripremljene; Bash sintaksa proverena u WSL-u. Nisu instalirane niti funkcionalno proverene na Pi-ju. Cilj je Raspberry Pi OS 64-bit sa desktopom i Node.js 22+ na /usr/bin/node. Potrebni su rsync, curl i Chromium.

## Server

Raspakovati release van /opt/eye. Pregled plana: `bash deploy/pi/install.sh`. Instalacija: `sudo bash deploy/pi/install.sh --apply`. Instalater odbija prepisivanje postojećeg /opt/eye. Ne uključuje servis dok se ne obavi lokalni setup.

1. `sudoedit /etc/eye.env`: uneti novi API ključ, model gpt-5.1 i budžet. Ključ nije deo release-a.
2. `sudo -u eye-server env EYE_STATE_DIR=/var/lib/eye /usr/bin/node /opt/eye/scripts/setup-admin.cjs`: postaviti administratorsku šifru.
3. `sudo systemctl enable --now eye.service`.
4. Provera: `systemctl status eye.service`, `journalctl -u eye.service`, `curl http://localhost:5173/api/central/status`.

Programski fajlovi su root-owned; servis koristi poseban nalog bez login shell-a. Stanje i istorija su u /var/lib/eye, sa ograničenim pristupom. Restart=on-failure oporavlja pad, ali namerni admin stop (exit 0) ne pokreće server ponovo. Posle namernog stop-a: `sudo systemctl start eye`. Pet brzih padova ograničava restart petlju; prvo otkloniti uzrok pa `sudo systemctl reset-failed eye`.

Za upgrade prvo zaustaviti servis i napraviti proverenu kopiju /var/lib/eye i /etc/eye.env na administratorov medij. Ne koristiti world-readable lokaciju. Sačuvati ai-budget.json: uklanjanje tog fajla resetuje lokalni budžet. Povratak na staru verziju zahteva odgovarajuću kopiju stanja.

## Desktop i dva ekrana

Za namenski labwc kiosk koristiti [KIOSK.md](KIOSK.md): oba prozora, systemd user servis, ograničenje prečica i administratorski izlaz preko SSH-a. Konfiguracija nije primenjena na ovom računaru. Potreban je poseban desktop nalog bez sudo/admin grupa.

Skripta koristi isti Chromium profil i localhost za oba prozora. Raspored monitora i fullscreen drugog prozora moraju se proveriti i podesiti na stvarnom uređaju. Labwc/Wayland može ignorisati položaj prozora zadat preko Chromium argumenata, zato skripta ne izmišlja koordinate monitora.

chromium-policy.json je pripremljen skup ograničenja. Administrator ga na Pi-ju može postaviti u /etc/chromium/policies/managed/eye.json i proveriti svaku politiku kroz chrome://policy pre zaključavanja browsera. Nije primenjen na ovom Windows računaru. Ne koristiti --no-sandbox ili zastavice koje isključuju browser zaštite.

Browser fullscreen nije potpuno OS zaključavanje. Na ciljnom uređaju posebno proveriti i ograničiti desktop menije, prečice, promenu VT-a, pristup terminalu, sleep/power tastere i automatsko montiranje USB uređaja. Ne menjati SSH i administratorski pristup dok nije isproban oporavak. Fizička zaštita portova, kućišta i SD kartice je zaseban zahtev. Ne postoji potvrda da je uređaj nemoguće napustiti bez ovih proba.

## Hardver koji još nije dostupan

Potrebno je potvrditi: model Pi-ja i OS, oba TV-a i njihove rezolucije, kameru/interfejs, značenje SISI/CSI, Arduino model i serijski protokol, pinove, napajanje i očekivane signale. Nisu izmišljeni pinovi niti aktivirani releji. Eye ekran radi bez kamere; njegovi snimci predstavljaju AI izraze, ne živu kameru.

Pri prijemu opreme: prvo video na oba izlaza, zatim kamera kao read-only preview, pa Arduino u simulaciji bez priključenih aktuatora; tek potom pojedinačno potvrđene izlazne komande. Za sada nema implementirane hardverske integracije.

Osnova za labwc autostart i granice kiosk zaštite: https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/

## Osvežavanje verzije i nedostajući zapisi

`git pull --ff-only` preuzima samo commitovane i poslate izmene, u repozitorijumu u kom je pokrenut. Posle ažuriranja restartovati Node server i osvežiti oba browser prozora sa Ctrl+F5; otvorena igra zadržava prethodnu listu arhive do osvežavanja.

Provera iz foldera kloniranog repozitorijuma:

```sh
git pull --ff-only
git log -1 --oneline
ls terminal-sketch/content/home/operator/medical/
```

Ako je igra instalirana kao servis, proveriti `systemctl cat eye.service`: servis možda pokreće `/opt/eye/server.js`, dok je Git repozitorijum u drugom folderu. Pull u klonu ne ažurira automatski instalaciju u `/opt/eye`. Pratiti upgrade postupak iz odeljka Server i zatim `sudo systemctl restart eye.service`.

Nove partije traju 20 minuta. Postojeća sačuvana partija zadržava svoj tajmer; za punih 20 minuta pokrenuti novu partiju preko administratorskog panela. Neural Link se automatski otvara posle prihvaćenog Medical koda; uspeh daje Access 1 i u listi označava aplikaciju kao završenu.
