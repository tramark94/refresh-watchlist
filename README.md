# Refresh Watchlist

Script Google Apps Script che aggiunge in automatico i nuovi video dei canali YouTube scelti alla playlist privata "Da guardare". Gira sui server Google ogni ora, anche a PC spento.

- `apps-script/da-guardare.gs`: copia di backup dello script.
- `docs/`: homepage, privacy policy e termini richiesti da Google per l'app OAuth (pubblicati con GitHub Pages).

## Configurazione

1. Nel progetto Apps Script aggiungi la libreria OAuth2 (ID `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`).
2. In Impostazioni progetto > Proprietà script imposta `CLIENT_ID` e `CLIENT_SECRET` (dal progetto Google Cloud).
3. Esegui `autorizza`, apri il link del log e scegli il canale YouTube.
4. Esegui `installa`.

Le credenziali non sono nel codice: restano solo nelle proprietà dello script.
