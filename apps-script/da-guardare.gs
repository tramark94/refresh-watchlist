/**
 * "Da guardare": aggiunge in automatico i nuovi video dei canali scelti
 * alla playlist privata "Da guardare". Gira sui server Google (Apps Script),
 * quindi funziona anche a PC spento.
 *
 * Usa credenziali OAuth proprie (progetto Google Cloud) perché il canale è un
 * account brand: l'autorizzazione standard di Apps Script non lo permette.
 *
 * Configurazione (una volta sola):
 *  1. Libreria OAuth2: ID 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
 *  2. Impostazioni progetto > Proprietà script: CLIENT_ID e CLIENT_SECRET
 *  3. Esegui "autorizza", apri il link del log e scegli il canale YouTube giusto
 *  4. Esegui "installa"
 */

const PLAYLIST_ID = 'PLaKlkH4rBJgE'; // playlist "Da guardare"
const START_DATE = '2026-11-04T00:00:00Z'; // ignora video più vecchi di così

// filtro: assente = tutti i video; RegExp = solo titoli che corrispondono;
// playlist: = solo i video aggiunti a quella playlist del canale.
const CANALI = [
  { nome: '3Blue1Brown', id: 'UCYO_jab_esuFRV4b17AJtAw' },
  { nome: '8-bit Music Theory', id: 'UCeZLO2VgbZHeDcongKzzfOw' },
  { nome: 'BdoubleO100', id: 'UClu2e7S8atp6tG2galK9hgg', playlist: 'PL2XncHqN_7yLaEfrnHQAg2xlC28ENmUWZ' }, // Building with Bdubs S3
  { nome: 'Breaking Italy', id: 'UC4V3oCikXeSqYQr0hBMARwg' },
  { nome: 'Charles Cornell', id: 'UC4PIiYewI1YGyiZvgNlJNrA' },
  { nome: 'Cydonia', id: 'UClVZYutBmlVLvmGw27hL_9Q' },
  { nome: 'EthosLab', id: 'UCFKDEp9si4RmHFWJW1vYsMA', playlist: 'PLaAVDbMg_XArcet5lwcRo12Fh9JrGKydh' },  // Etho Plays Minecraft S2
  { nome: 'Francesco Costa', id: 'UCWIkgZzXznmBgU9uQsvjZAQ' },
  { nome: 'I Termosifoni', id: 'UCIASBGI8NRtvyvcDewznHXw' },
  { nome: 'Il Matthew del Tubo', id: 'UCpF62eV02XJpqJxBZAcsDCw' },
  { nome: 'Kurzgesagt', id: 'UCsXVk37bltHxD1rDPwtNM8Q' },
  { nome: 'Luca Perri', id: 'UCyHaMPx0k-TY4gyqmRT23Vg' },
  { nome: 'My Name Is Andong', id: 'UCyEA3vUnlpg0xzkECEq1rOA' },
  { nome: 'Parliamo di Videogiochi', id: 'UChQlb1CdktgAt4k7U0TqisQ' },
  { nome: 'Power Pizza', id: 'UC3Mr_B43ZHl-jHRYcgxuRFA', filtro: /PPP\s*\d+/ }, // solo puntate del podcast
  { nome: 'Pratt', id: 'UC9pjLoZGrwLu9KqKw9znE1A' },
  { nome: 'Slimdogs', id: 'UCX2X-MpokMoIyGdbiGwzPew', filtro: /disastr[oi] produttiv|la scienza di/i },
  { nome: 'Gaming Dogs', id: 'UClhYfl7drwcs2VDJ6F8JaTA', filtro: /la scienza di/i },
  { nome: 'Veritasium', id: 'UCHnyfMqiRRG1u-2MsSQLbXA' },
  { nome: 'xisumasays', id: 'UCm6yD26HlafzqNlYaK7uEaA' },
  { nome: 'xisumavoid', id: 'UCU9pX8hKcrx06XfOB-VQLdw', playlist: 'PL7VmhWGNRxKixIX8tWEQn-BnYKE9AaAXk' }, // Minecraft Updates
  { nome: 'yotobi', id: 'UCIPsK5xspHC3-ZFNPTx2X_w' },
  { nome: 'YotobiGames', id: 'UCMxsVULY_qsk_aNdAqzcNUA' },
];

// ---------- autorizzazione ----------

function servizio_() {
  const p = PropertiesService.getScriptProperties();
  return OAuth2.createService('youtube')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/v2/auth')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setClientId(p.getProperty('CLIENT_ID'))
    .setClientSecret(p.getProperty('CLIENT_SECRET'))
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/youtube')
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent select_account');
}

/** Passo 1: esegui e apri il link che compare nel log. */
function autorizza() {
  const s = servizio_();
  s.reset();
  console.log('Apri questo link e scegli il tuo canale YouTube: ' + s.getAuthorizationUrl());
}

function authCallback(request) {
  const ok = servizio_().handleCallback(request);
  return HtmlService.createHtmlOutput(ok ? 'Autorizzato! Torna nell\'editor ed esegui "installa".' : 'Autorizzazione negata.');
}

/** Chiamata alle API di YouTube con il token del canale scelto. */
function yt_(metodo, risorsa, params, body) {
  const s = servizio_();
  if (!s.hasAccess()) throw new Error('Non autorizzato: esegui "autorizza".');
  const q = Object.keys(params || {})
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const opt = { method: metodo, headers: { Authorization: 'Bearer ' + s.getAccessToken() }, muteHttpExceptions: true };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  const r = UrlFetchApp.fetch('https://www.googleapis.com/youtube/v3/' + risorsa + '?' + q, opt);
  const j = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() >= 300) throw new Error(risorsa + ': ' + (j.error && j.error.message));
  return j;
}

// ---------- logica ----------

/** Passo 2: crea il controllo automatico ogni ora. */
function installa() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('aggiorna').timeBased().everyHours(1).create();
  aggiorna();
}

function aggiorna() {
  const props = PropertiesService.getScriptProperties();
  controllaPlaylist_();
  const giaInPlaylist = idInPlaylist_(PLAYLIST_ID);
  const visti = new Set(JSON.parse(props.getProperty('visti') || '[]'));
  const nuovi = [];

  for (const c of CANALI) {
    // UULF... = caricamenti del canale senza Shorts e dirette
    const sorgente = c.playlist || 'UULF' + c.id.slice(2);
    let items;
    try {
      items = yt_('get', 'playlistItems', { part: 'snippet,contentDetails', playlistId: sorgente, maxResults: 15 }).items || [];
    } catch (e) {
      console.warn(c.nome + ': ' + e.message);
      continue;
    }
    for (const it of items) {
      const vid = it.contentDetails.videoId;
      const data = it.contentDetails.videoPublishedAt || it.snippet.publishedAt;
      if (!vid || visti.has(vid) || giaInPlaylist.has(vid)) continue;
      if (data < START_DATE) { visti.add(vid); continue; }
      if (c.filtro && !c.filtro.test(it.snippet.title)) { visti.add(vid); continue; }
      nuovi.push({ vid, data, canale: c.nome, titolo: it.snippet.title, chId: c.id, daPlaylist: !!c.playlist });
    }
  }

  // dettagli dei candidati: scarta dirette e premiere non ancora uscite;
  // per i canali filtrati per playlist scarta anche gli Shorts
  const ok = [];
  for (let i = 0; i < nuovi.length; i += 50) {
    const blocco = nuovi.slice(i, i + 50);
    const det = yt_('get', 'videos', { part: 'contentDetails,snippet', id: blocco.map(n => n.vid).join(',') }).items || [];
    const byId = {};
    det.forEach(d => { byId[d.id] = d; });
    for (const n of blocco) {
      const d = byId[n.vid];
      if (!d) continue; // privato o non ancora disponibile: riprova al prossimo giro
      if (d.snippet.liveBroadcastContent !== 'none') continue; // diretta/premiere: riprova più tardi
      if (n.daPlaylist && !videoNormale_(n.chId, n.vid)) continue; // Short, o non ancora indicizzato: riprova più tardi
      visti.add(n.vid);
      ok.push(n);
    }
  }

  ok.sort((a, b) => a.data.localeCompare(b.data));
  for (const n of ok) {
    yt_('post', 'playlistItems', { part: 'snippet' },
      { snippet: { playlistId: PLAYLIST_ID, resourceId: { kind: 'youtube#video', videoId: n.vid } } });
    console.log('Aggiunto: ' + n.canale + ' - ' + n.titolo);
  }
  console.log('Fatto: ' + ok.length + ' video aggiunti.');

  props.setProperty('visti', JSON.stringify([...visti].slice(-3000)));
}

/** Ferma tutto con un messaggio chiaro se lo script è collegato al canale sbagliato. */
function controllaPlaylist_() {
  const r = yt_('get', 'playlists', { part: 'snippet', id: PLAYLIST_ID });
  if (r.items && r.items.length) return;
  const ch = (yt_('get', 'channels', { part: 'snippet', mine: true }).items || []).map(c => c.snippet.title).join(', ');
  throw new Error('Playlist "Da guardare" non trovata. Canale collegato: ' + (ch || 'nessuno') + '. Riesegui "autorizza" e scegli il canale giusto.');
}

function idInPlaylist_(pid) {
  const s = new Set();
  let token;
  do {
    const r = yt_('get', 'playlistItems', { part: 'contentDetails', playlistId: pid, maxResults: 50, pageToken: token });
    (r.items || []).forEach(i => s.add(i.contentDetails.videoId));
    token = r.nextPageToken;
  } while (token);
  return s;
}

/** Vero se il video compare tra i caricamenti "lunghi" del canale (UULF): non è uno Short né una diretta. */
function videoNormale_(chId, vid) {
  try {
    const r = yt_('get', 'playlistItems', { part: 'id', playlistId: 'UULF' + chId.slice(2), videoId: vid });
    return (r.items || []).length > 0;
  } catch (e) {
    return false; // nel dubbio meglio non aggiungerlo
  }
}
