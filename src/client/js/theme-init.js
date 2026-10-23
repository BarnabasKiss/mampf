/*
 * Läuft vor dem ersten Rendern (klassisches Skript im <head>):
 *  1. wendet das gespeicherte Farbschema an (Hell/Dunkel/Auto) – siehe theme.js
 *  2. schaltet das optionale Anna-Theme per Link ein/aus: /?anna=1 bzw. /?anna=0
 *  3. lädt dessen Stylesheet sofort, damit nichts im falschen Look aufblitzt – siehe /anna
 */
try {
  const root = document.documentElement;

  const theme = JSON.parse(localStorage.getItem('mampf.theme'));
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;

  const url = new URL(location.href);
  const stored = JSON.parse(localStorage.getItem('mampf.anna')) || {};
  if (url.searchParams.has('anna')) {
    stored.enabled = url.searchParams.get('anna') !== '0';
    localStorage.setItem('mampf.anna', JSON.stringify(stored));
    url.searchParams.delete('anna');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  if (stored.enabled) {
    const month = new Date().getMonth();
    const season = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
    root.dataset.anna = '';
    root.dataset.annaKey = stored.season && stored.season !== 'auto' ? stored.season : season; // Feinabstimmung (Anlässe) macht anna.js
    const link = document.createElement('link');
    link.id = 'anna-css';
    link.rel = 'stylesheet';
    link.href = '/anna/anna.css';
    document.head.append(link);
  }
} catch {
  // Kein localStorage oder defekte Werte – es gilt das Standard-Theme.
}
