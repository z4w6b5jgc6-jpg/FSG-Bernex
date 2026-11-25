// thème avant le premier affichage (évite un flash clair en mode sombre)
try { var t = localStorage.getItem('athle-theme') } catch {}
document.documentElement.dataset.theme = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
try { document.documentElement.dataset.tiles = JSON.parse(localStorage.getItem('athle-tile-style')) || 'sobre'; document.documentElement.dataset.density = JSON.parse(localStorage.getItem('athle-tile-size')) || 'grande' } catch {}
