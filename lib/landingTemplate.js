const { Providers } = require('./filter');
const { SortOptions } = require('./sort');
const { LanguageOptions } = require('./sort');
const { QualityFilter } = require('./filter');
const { DebridOptions } = require('../moch/options');
const { MochOptions } = require('../moch/moch');
const { PreConfigurations } = require('../lib/configuration');

// Where each debrid service shows its api key; putio needs two values.
const MOCH_KEY_HELP = {
  realdebrid: { url: 'https://real-debrid.com/apitoken', label: 'API token' },
  premiumize: { url: 'https://www.premiumize.me/account', label: 'API key' },
  alldebrid: { url: 'https://alldebrid.com/apikeys', label: 'API key' },
  debridlink: { url: 'https://debrid-link.fr/webapp/apikey', label: 'API key' },
  offcloud: { url: 'https://offcloud.com/#/account', label: 'API key' },
  torbox: { url: 'https://torbox.app/settings', label: 'API key' },
  putio: { url: 'https://app.put.io/settings/account/oauth/apps', label: 'OAuth app ClientId and Token' }
};

const STYLESHEET = `
:root {
  --bg: #0b0b12;
  --surface: rgba(255, 255, 255, 0.045);
  --surface-strong: rgba(255, 255, 255, 0.08);
  --border: rgba(255, 255, 255, 0.09);
  --border-strong: rgba(255, 255, 255, 0.18);
  --text: #f2f1f7;
  --muted: #a09db2;
  --faint: #6f6c80;
  --accent: #8b6cff;
  --accent-2: #5b8cff;
  --accent-soft: rgba(139, 108, 255, 0.16);
  --danger: #ff6b81;
  --ok: #3ddc97;
  --radius: 16px;
  --radius-sm: 10px;
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  min-height: 100vh;
  background:
    radial-gradient(900px 500px at 12% -10%, rgba(139, 108, 255, 0.22), transparent 60%),
    radial-gradient(700px 480px at 100% 10%, rgba(91, 140, 255, 0.16), transparent 60%),
    var(--bg);
  background-attachment: fixed;
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.shell {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px 140px;
}

/* Header */
.hero {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}
.hero img {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  flex-shrink: 0;
  background: var(--surface-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.hero h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.version {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
}
.tagline { margin: 4px 0 10px; color: var(--muted); }
.types { display: flex; gap: 6px; flex-wrap: wrap; }
.type {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  background: var(--surface-strong);
  border-radius: 999px;
  padding: 3px 10px;
}

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 22px;
  margin-bottom: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.card h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.hint { margin: 0 0 16px; color: var(--muted); font-size: 13.5px; }

.text-btn {
  background: none;
  border: 0;
  padding: 4px 0;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.text-btn:hover { text-decoration: underline; }

/* Chips */
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.chip:hover { border-color: var(--accent); color: var(--text); }
.chip[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--text);
}
.chip .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--faint);
}
.chip[aria-pressed="true"] .dot { background: var(--accent); }
.chips.exclude .chip[aria-pressed="false"] {
  color: var(--danger);
  border-color: rgba(255, 107, 129, 0.35);
  text-decoration: line-through;
}
.chips.exclude .chip[aria-pressed="false"] .dot { background: var(--danger); }

/* Fields */
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field > label, .label {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.input, select.input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text);
  font: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input::placeholder { color: var(--faint); }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.input.invalid { border-color: var(--danger); }
select.input {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%23a09db2' stroke-width='1.6'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
  cursor: pointer;
}
select.input option { background: #1a1826; color: var(--text); }
.error { color: var(--danger); font-size: 12.5px; display: none; }
.input.invalid + .error { display: block; }

/* Debrid provider picker */
.segmented {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}
.segmented .chip { justify-content: center; border-radius: var(--radius-sm); padding: 10px 12px; }

.secret { position: relative; }
.secret .input { padding-right: 70px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13.5px; }
.secret .reveal {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface-strong);
  border: 0;
  border-radius: 7px;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 9px;
  cursor: pointer;
}
.secret .reveal:hover { color: var(--text); }
.stack { display: flex; flex-direction: column; gap: 8px; }
[hidden] { display: none !important; }

/* Switches */
.switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  cursor: pointer;
  font-size: 14px;
}
.switch input { position: absolute; opacity: 0; pointer-events: none; }
.track {
  position: relative;
  width: 40px;
  height: 23px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--surface-strong);
  border: 1px solid var(--border-strong);
  transition: background 0.15s, border-color 0.15s;
}
.track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--muted);
  transition: transform 0.15s, background 0.15s;
}
.switch input:checked + .track { background: var(--accent); border-color: var(--accent); }
.switch input:checked + .track::after { transform: translateX(17px); background: #fff; }
.switch input:focus-visible + .track { box-shadow: 0 0 0 3px var(--accent-soft); }

/* Install bar */
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(11, 11, 18, 0.98) 55%, rgba(11, 11, 18, 0));
}
.actions-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  gap: 10px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  padding: 0 20px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  background: var(--surface-strong);
  color: var(--text);
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.1s, filter 0.15s, background 0.15s;
}
.btn:hover { text-decoration: none; background: rgba(255, 255, 255, 0.12); }
.btn:active { transform: translateY(1px); }
.btn.primary {
  flex: 1;
  border: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 8px 24px rgba(110, 100, 255, 0.35);
}
.btn.primary:hover { filter: brightness(1.08); }
.btn.copied { color: var(--ok); border-color: var(--ok); }

.footer { text-align: center; color: var(--faint); font-size: 12.5px; margin-top: 24px; }
.footer a { color: var(--muted); }

@media (max-width: 560px) {
  .shell { padding-top: 28px; }
  .hero { gap: 14px; }
  .hero img { width: 60px; height: 60px; border-radius: 16px; }
  .hero h1 { font-size: 24px; }
  .grid { grid-template-columns: 1fr; gap: 0; }
  .grid .field { margin-bottom: 16px; }
  .card { padding: 18px; }
  .btn { padding: 0 14px; }
  .btn .wide { display: none; }
}
`;

function landingTemplate(manifest, config = {}) {
  const logo = manifest.logo || 'https://dl.strem.io/addon-logo.png';
  const debridProvider = Object.keys(MochOptions).find(mochKey => config[mochKey]) || '';
  const putioKey = config[MochOptions.putio.key] || '';

  // Everything the page script needs, with the saved configuration prefilled.
  const state = {
    keys: {
      providers: Providers.key,
      sort: SortOptions.key,
      language: LanguageOptions.key,
      qualityFilter: QualityFilter.key,
      debridOptions: DebridOptions.key
    },
    defaultSort: SortOptions.options.qualitySeeders.key,
    limitPerTotalSorts: [SortOptions.options.seeders.key, SortOptions.options.size.key],
    allProviders: Providers.options.map(provider => provider.key),
    mochKeys: Object.keys(MochOptions),
    preConfigurations: Object.fromEntries(Object.entries(PreConfigurations)
        .map(([key, preConfig]) => [key, preConfig.serialized])),
    config: {
      providers: config[Providers.key] || Providers.options.map(provider => provider.key),
      sort: config[SortOptions.key] || SortOptions.options.qualitySeeders.key,
      language: config[LanguageOptions.key] || 'none',
      qualityFilters: config[QualityFilter.key] || [],
      limit: config.limit || '',
      debridProvider,
      debridOptions: config[DebridOptions.key] || [],
      mochKeys: Object.fromEntries(Object.keys(MochOptions)
          .filter(key => key !== MochOptions.putio.key)
          .map(key => [key, config[key] || ''])),
      putioClientId: putioKey.replace(/@.*/, ''),
      putioToken: putioKey.includes('@') ? putioKey.replace(/.*@/, '') : ''
    }
  };

  const providersHTML = Providers.options
      .map(provider => `<button type="button" class="chip" data-provider="${provider.key}" aria-pressed="false">`
          + `<span class="dot"></span>${provider.foreign ? provider.foreign + ' ' : ''}${provider.label}</button>`)
      .join('\n');
  const sortOptionsHTML = Object.values(SortOptions.options)
      .map(option => `<option value="${option.key}">${option.description}</option>`)
      .join('\n');
  const languageOptionsHTML = LanguageOptions.options
      .map(option => `<option value="${option.key}">${option.label}</option>`)
      .join('\n');
  const qualityFiltersHTML = QualityFilter.options
      .map(option => `<button type="button" class="chip" data-quality="${option.key}" aria-pressed="true">`
          + `<span class="dot"></span>${option.label}</button>`)
      .join('\n');
  const debridProvidersHTML = [{ key: '', name: 'None' }, ...Object.values(MochOptions)]
      .map(moch => `<button type="button" class="chip" data-moch="${moch.key}" aria-pressed="false">${moch.name}</button>`)
      .join('\n');
  const mochKeyFieldsHTML = Object.values(MochOptions)
      .map(moch => {
        const help = MOCH_KEY_HELP[moch.key] || { label: 'API key' };
        const helpLink = help.url ? ` · <a href="${help.url}" target="_blank" rel="noopener">find it here</a>` : '';
        const inputs = moch.key === MochOptions.putio.key
            ? `<div class="stack">
                 ${secretInput('putioClientId', 'ClientId')}
                 ${secretInput('putioToken', 'Token')}
               </div>`
            : secretInput(`key-${moch.key}`, `${moch.name} ${help.label}`);
        return `<div class="field" data-moch-field="${moch.key}" hidden>
                  <span class="label">${moch.name} ${help.label}${helpLink}</span>
                  ${inputs}
                </div>`;
      })
      .join('\n');
  const debridOptionsHTML = Object.values(DebridOptions.options)
      .map(option => `<label class="switch"><span>${option.description}</span>`
          + `<input type="checkbox" data-debrid-option="${option.key}"><span class="track"></span></label>`)
      .join('\n');
  const stylizedTypes = manifest.types
      .map(t => t[0].toUpperCase() + t.slice(1) + (t !== 'series' ? 's' : ''));
  const contactHTML = manifest.contactEmail
      ? `<p class="footer">Contact: <a href="mailto:${manifest.contactEmail}">${manifest.contactEmail}</a></p>`
      : '';
  const stateJSON = JSON.stringify(state).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${manifest.name} - Stremio Addon</title>
  <link rel="shortcut icon" href="${logo}" type="image/x-icon">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${STYLESHEET}</style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <img src="${logo}" alt="">
      <div>
        <h1>${manifest.name} <span class="version">v${manifest.version || '0.0.0'}</span></h1>
        <p class="tagline">Torrent streams for Stremio, with optional debrid playback.</p>
        <div class="types">${stylizedTypes.map(t => `<span class="type">${t}</span>`).join('')}</div>
      </div>
    </header>

    <section class="card">
      <div class="card-head">
        <h2>Sources</h2>
        <button type="button" class="text-btn" id="toggleProviders">Select all</button>
      </div>
      <p class="hint">Trackers to take torrents from.</p>
      <div class="chips" id="providers">${providersHTML}</div>
    </section>

    <section class="card">
      <h2>Sorting &amp; filters</h2>
      <p class="hint">How results are ordered and which ones are hidden.</p>
      <div class="grid">
        <div class="field">
          <label for="sort">Sorting</label>
          <select id="sort" class="input">${sortOptionsHTML}</select>
        </div>
        <div class="field">
          <label for="language">Priority language</label>
          <select id="language" class="input" title="Streams with dubs/subs in this language are shown first">
            <option value="none">None</option>
            ${languageOptionsHTML}
          </select>
        </div>
      </div>
      <div class="field">
        <span class="label">Qualities <span style="font-weight:400">— tap to hide</span></span>
        <div class="chips exclude" id="qualities">${qualityFiltersHTML}</div>
      </div>
      <div class="field">
        <label for="limit" id="limitLabel">Max results per quality</label>
        <input type="text" inputmode="numeric" id="limit" class="input" placeholder="All results" autocomplete="off">
        <span class="error">Enter a whole number greater than 0, or leave empty.</span>
      </div>
    </section>

    <section class="card">
      <h2>Debrid</h2>
      <p class="hint">Play through a debrid service instead of P2P.</p>
      <div class="segmented" id="mochs">${debridProvidersHTML}</div>
      ${mochKeyFieldsHTML}
      <div id="debridOptions" hidden>${debridOptionsHTML}</div>
    </section>

    ${contactHTML}
  </main>

  <div class="actions">
    <div class="actions-inner">
      <a id="install" class="btn primary" href="#">Install in Stremio</a>
      <button type="button" id="copy" class="btn" title="Copy the manifest URL"><span id="copyText">Copy</span><span class="wide">&nbsp;link</span></button>
      <a id="web" class="btn" target="_blank" rel="noopener" title="Install in Stremio Web">Web</a>
    </div>
  </div>

  <script>(${pageScript.toString()})(${stateJSON});</script>
</body>
</html>`;
}

function secretInput(id, placeholder) {
  return `<div class="secret">
            <input type="password" id="${id}" class="input" placeholder="${placeholder}"
                   autocomplete="off" autocapitalize="off" spellcheck="false">
            <button type="button" class="reveal" data-reveal="${id}">Show</button>
          </div>`;
}

// Runs in the browser: serialized into the page with toString(), so it must
// not reference anything from this module.
function pageScript(state) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const config = state.config;
  const PUTIO = 'putio';

  const pressed = (el, value) => el.setAttribute('aria-pressed', String(value));
  const isPressed = el => el.getAttribute('aria-pressed') === 'true';

  // Prefill
  $$('[data-provider]').forEach(chip => pressed(chip, config.providers.includes(chip.dataset.provider)));
  $$('[data-quality]').forEach(chip => pressed(chip, !config.qualityFilters.includes(chip.dataset.quality)));
  $('#sort').value = config.sort;
  $('#language').value = config.language;
  $('#limit').value = config.limit;
  Object.entries(config.mochKeys).forEach(([key, value]) => {
    const input = document.getElementById(`key-${key}`);
    if (input) input.value = value;
  });
  $('#putioClientId').value = config.putioClientId;
  $('#putioToken').value = config.putioToken;
  $$('[data-debrid-option]').forEach(box => box.checked = config.debridOptions.includes(box.dataset.debridOption));
  let debridProvider = config.debridProvider;

  // Interactions
  $$('[data-provider]').forEach(chip => chip.addEventListener('click', () => {
    const selected = $$('[data-provider]').filter(isPressed);
    if (isPressed(chip) && selected.length === 1) return; // keep at least one source
    pressed(chip, !isPressed(chip));
    update();
  }));
  $('#toggleProviders').addEventListener('click', () => {
    $$('[data-provider]').forEach(chip => pressed(chip, true));
    update();
  });
  $$('[data-quality]').forEach(chip => chip.addEventListener('click', () => {
    pressed(chip, !isPressed(chip));
    update();
  }));
  $$('[data-moch]').forEach(chip => chip.addEventListener('click', () => {
    debridProvider = chip.dataset.moch;
    update();
  }));
  $$('[data-reveal]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.reveal);
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    button.textContent = hidden ? 'Hide' : 'Show';
  }));
  $$('input, select').forEach(el => el.addEventListener('input', update));
  $$('input[type=checkbox], select').forEach(el => el.addEventListener('change', update));

  const install = $('#install');
  const copy = $('#copy');
  let manifestUrl = '';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(manifestUrl);
    } catch (e) {
      window.prompt('Copy the manifest URL:', manifestUrl);
      return;
    }
    copy.classList.add('copied');
    $('#copyText').textContent = 'Copied';
    setTimeout(() => {
      copy.classList.remove('copied');
      $('#copyText').textContent = 'Copy';
    }, 1600);
  });

  function update() {
    // Sources and debrid picker state
    const providerChips = $$('[data-provider]');
    const selectedProviders = providerChips.filter(isPressed).map(chip => chip.dataset.provider);
    $('#toggleProviders').hidden = selectedProviders.length === providerChips.length;
    $$('[data-moch]').forEach(chip => pressed(chip, chip.dataset.moch === debridProvider));
    $$('[data-moch-field]').forEach(field => field.hidden = field.dataset.mochField !== debridProvider);
    $('#debridOptions').hidden = !debridProvider;
    $('#limitLabel').textContent = state.limitPerTotalSorts.includes($('#sort').value)
        ? 'Max results' : 'Max results per quality';

    const limitInput = $('#limit');
    const limitValue = limitInput.value.trim();
    const limitValid = !limitValue || /^[1-9][0-9]*$/.test(limitValue);
    limitInput.classList.toggle('invalid', !limitValid);

    // Same serialization as the configuration parser expects: key=value|key=value
    const allProviders = selectedProviders.length === state.allProviders.length;
    const sort = $('#sort').value;
    const language = $('#language').value;
    const excludedQualities = $$('[data-quality]').filter(chip => !isPressed(chip)).map(chip => chip.dataset.quality);
    const debridOptions = $$('[data-debrid-option]').filter(box => box.checked).map(box => box.dataset.debridOption);
    const mochValue = key => {
      if (key !== debridProvider) return '';
      if (key === PUTIO) {
        const clientId = $('#putioClientId').value.trim();
        const token = $('#putioToken').value.trim();
        return clientId && token ? `${clientId}@${token}` : '';
      }
      return document.getElementById(`key-${key}`).value.trim();
    };
    const mochValues = state.mochKeys.map(key => [key, mochValue(key)]);
    const hasMoch = mochValues.some(([, value]) => value);

    let configuration = [
      [state.keys.providers, allProviders ? '' : selectedProviders.join(',')],
      [state.keys.sort, sort !== state.defaultSort ? sort : ''],
      [state.keys.language, language !== 'none' ? language : ''],
      [state.keys.qualityFilter, excludedQualities.join(',')],
      ['limit', limitValid ? limitValue : ''],
      [state.keys.debridOptions, hasMoch ? debridOptions.join(',') : ''],
      ...mochValues
    ].filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join('|');
    configuration = Object.keys(state.preConfigurations)
        .find(key => state.preConfigurations[key] === configuration) || configuration;

    const path = (configuration ? `/${configuration}` : '') + '/manifest.json';
    manifestUrl = `${window.location.protocol}//${window.location.host}${path}`;
    install.href = `stremio://${window.location.host}${path}`;
    $('#web').href = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;
  }

  update();
}

module.exports = landingTemplate;
