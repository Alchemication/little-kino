// The site's two languages, English and Polish. Shared by every page of the
// site but the world cards, which have no words (nor do the worlds).
//
// A page is written in English. Its Polish rides along in a JSON block,
// <script type="application/json" id="pl">, keyed by the data-t of the
// element whose content it replaces, or the data-t-label of one whose
// aria-label and title it replaces; a page's own script asks for a string
// with Lang.t(key, english). `main.py site` fills the {{…}} in both, and
// refuses a page whose keys and Polish don't match (src/website.py).
//
// Which language: ?lang= in the address (a link sent to a Polish
// grandparent), else the one kept in this browser (localStorage), else the
// browser's first language. A choice on the switch, or one an address
// brought, is kept, so the next visit opens in it; links to the site's
// other pages carry it too, so it holds even where storage is blocked.
;(() => {
  const LANGS = ['en', 'pl']
  const KEY = 'little-kino-lang'
  const SITE_PAGE = /^([\w-]+\.html)(?:\?[^#]*)?(#.*)?$/ // a link to another of the site's pages
  const block = document.getElementById('pl')
  const pl = block ? JSON.parse(block.textContent) : {}
  const content = [...document.querySelectorAll('[data-t]')]
  const labelled = [...document.querySelectorAll('[data-t-label]')]
  const english = new Map(content.map((el) => [el, el.innerHTML]))
  const label = (el, attr) => (el.hasAttribute(attr) ? [[attr, el.getAttribute(attr)]] : [])
  const englishLabels = new Map(labelled.map((el) => [el, [...label(el, 'aria-label'), ...label(el, 'title')]]))
  let now = 'en'

  const keep = (lang) => {
    try { localStorage.setItem(KEY, lang) } catch { /* storage blocked (a private window): the address and the links carry it */ }
  }

  const pick = () => {
    const asked = new URLSearchParams(location.search).get('lang')
    if (LANGS.includes(asked)) { keep(asked); return asked }
    let kept = null
    try { kept = localStorage.getItem(KEY) } catch { /* storage blocked: the browser's language decides */ }
    if (LANGS.includes(kept)) return kept
    return /^pl\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'pl' : 'en'
  }

  const carry = (a) => {
    const m = a.getAttribute('href').match(SITE_PAGE)
    if (m) a.setAttribute('href', m[1] + (now === 'en' ? '' : `?lang=${now}`) + (m[2] || ''))
  }

  const apply = (lang) => {
    now = lang
    document.documentElement.lang = lang
    for (const el of content) el.innerHTML = lang === 'pl' && pl[el.dataset.t] != null ? pl[el.dataset.t] : english.get(el)
    for (const el of labelled) {
      for (const [attr, text] of englishLabels.get(el)) el.setAttribute(attr, lang === 'pl' && pl[el.dataset.tLabel] != null ? pl[el.dataset.tLabel] : text)
    }
    for (const a of document.querySelectorAll('a[href]')) carry(a)
    for (const b of document.querySelectorAll('.langs [data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang))
    document.dispatchEvent(new CustomEvent('lang', { detail: lang }))
  }

  const choose = (lang) => {
    apply(lang)
    keep(lang)
    try {
      const url = new URL(location.href)
      if (lang === 'en') url.searchParams.delete('lang')
      else url.searchParams.set('lang', lang)
      history.replaceState(null, '', url)
    } catch { /* a page opened from disk may refuse a new address: the choice holds all the same */ }
  }

  for (const b of document.querySelectorAll('.langs [data-lang]')) b.addEventListener('click', () => choose(b.dataset.lang))
  window.Lang = {
    get now() { return now },
    t: (key, text) => (now === 'pl' && pl[key] != null ? pl[key] : text),
  }
  apply(pick())
})()
