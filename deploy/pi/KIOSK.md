# Dva ekrana i administratorski izlaz — Raspberry Pi OS / labwc

## Status

Pripremljeno u projektu; nije primenjeno niti potvrđeno na fizičkom Pi-ju.
Terminal je `http://localhost:5173/`, oko `http://localhost:5173/eye.html?kiosk=1`.
Oba prozora koriste isti Chromium profil i isti localhost host: cookie ih vezuje
za istu partiju. Ne pokretati oko u incognito ili drugom profilu.
Launcher sada za oba prozora traži Chromium kiosk režim. HTML fullscreen dugme
se u kiosk prikazu oka ne prikazuje. Običan web fullscreen nije zaštita izlaska.

## Priprema na ciljnom uređaju

1. Koristiti poseban desktop nalog bez sudo prava. Pre zaključavanja potvrditi
   SSH pristup sa zasebnim administratorskim nalogom i sačuvati originalnu labwc
   konfiguraciju. Ove datoteke nisu konfiguracija za svakodnevni desktop.
2. Pokrenuti `wlr-randr` i zabeležiti stvarna imena, aktivne režime i položaje
   oba izlaza. U Screen Configuration podesiti prošireni desktop, bez mirror-a.
   Terminal i oko moraju biti na različitim izlazima; broj 1/2 u UI-ju nije
   pouzdana zamena za imena konektora. Ne pretpostavljati istu rezoluciju.
3. `python3 /opt/eye/deploy/pi/make-kiosk-config.py IME_TERMINAL_IZLAZA > /tmp/eye-rc.xml`
   pravi kompletnu konfiguraciju prečica za namenski nalog. Pregledati je, pa
   administrator postavlja kao njegov `~/.config/labwc/rc.xml`. Ne spajati sa
   `<default/>` prečicama. Ne ostavljati panel, desktop file manager, launcher,
   idle/lock programe ili power meni u autostartu kiosk sesije.
4. Postaviti `chromium-policy.json` kao `/etc/chromium/policies/managed/eye.json`.
   Proveriti `chrome://policy` pre zaključavanja. Browser i compositor moraju
   oba ograničavati izlazak; sam JavaScript nije dovoljan.
5. Kopirati `eye-display.service` u `~/.config/systemd/user/` kiosk naloga.
   U njegovom labwc autostartu koristiti:

   ```sh
   systemctl --user import-environment WAYLAND_DISPLAY DISPLAY XDG_CURRENT_DESKTOP
   systemctl --user daemon-reload
   systemctl --user start eye-display.service
   ```

   Ukloniti prethodni direktni poziv start-display.sh iz te namenski pripremljene
   konfiguracije da ne postoje dva vlasnika pokretanja. Servis pokreće oba
   prozora i oporavlja pad browser procesa. Zatvaranje samo jednog prozora dok
   drugi radi nije pokriveno restartom procesa i mora biti blokirano/provereno.
6. Na uređaju potvrditi da su oba prozora fullscreen i da svaki izlazi na svoj
   ekran. Automatsko raspoređivanje prozora još nije implementirano: Chromium
   pozicija nije pouzdana u svim labwc verzijama, a MoveToOutput ne pomera već
   fullscreen prozor. Za završnu konfiguraciju potrebni su izlazi i verzije
   `labwc --version` i `chromium --version` sa ciljnog uređaja.

## Specijalni način izlaska

Administratorski izlaz je preko prethodno proverenog SSH naloga, van tastature
igrača. Sa administratorskog naloga (zameniti KIOSK_USER stvarnim imenom):

```sh
sudo -u KIOSK_USER XDG_RUNTIME_DIR=/run/user/$(id -u KIOSK_USER) systemctl --user stop eye-display.service
```

Systemd zaustavlja oba prozora u grupi procesa i ne restartuje ih nakon ove
eksplicitne stop komande. `sudo systemctl stop eye` zasebno zaustavlja server.
Ne stavljati tajne lozinke u igru ili JavaScript. Web administratorska šifra
upravlja partijom/serverom; nije zamena za OS administratorski pristup.

## Obavezna proba pre publike

Proveriti F11, Escape, Alt+F4, Alt+Tab, Super, Ctrl+L/T/N/W, Ctrl+Shift+I,
Ctrl+Alt+F1…F12, desni klik i power/sleep tastere na stvarnoj tastaturi.
Escape mora i dalje zatvarati arhivski prikaz u igri bez izlaska iz kioska.
Proveriti dva upaljena ekrana posle restartovanja, pada browsera i odvajanja/
vraćanja video kabla; proveriti i administratorski izlaz preko SSH-a.
Ako bilo koja kombinacija otvori desktop ili nestane jedan ekran, instalacija
još nije spremna. Napajanje i fizičko isključivanje ne može garantovati browser.

Izvori za labwc konfiguraciju i granice MoveToOutput:
https://labwc.github.io/labwc-config.5.html
https://labwc.github.io/labwc-actions.5.html

## CRT televizor: veliki tekst

Na televizoru otvoriti `http://localhost:5173/?display=crt`.
CRT profil koristi jedan širok kanal; Tab ili dugmad KOSMOS/HRTOK menjaju kanal.
PageUp/PageDown pomeraju tekst. Polje za unos je stalno vidljivo van skrolovanog
sadržaja. Sat ostaje u gornjoj traci. Oko i dalje radi na zasebnoj eye.html stranici.
U ovom profilu Tab ne dopunjava komande. Za standardni prikaz koristiti `?display=desktop`.
Na prozorima do 900 CSS piksela širine CRT profil se uključuje automatski.
Pi launcher eksplicitno otvara CRT profil, uključujući kada konverter prijavi veliku rezoluciju.

Ostavljeno je 5% prostora uz svaku ivicu. Tekst je povećan, uklonjene su simulirane
scanline/vignette maske, a orbitalna mapa sakrivena u CRT profilu radi prostora za tekst.
Provereni su glavni kanali na browser viewportu 640x480; to nije merenje TV signala.
Model sa korisnikove nalepnice: LG 21FS2RLX-ZC. Stvarni izlazni video režim i veza
još nisu potvrđeni. Ovaj profil ne menja rezoluciju Pi-ja niti konvertera.
