// Dock — Material 3 launcher for your web apps

const STORAGE_KEY = 'pwa-home-apps';
const THEME_KEY = 'pwa-home-theme';
const LAYOUT_KEY = 'pwa-home-layout';
const APPS_SOURCE = './data/apps.json';

const EMOJI_CHOICES = [
    '📱', '🏠', '💼', '💰', '📊', '📈', '🗂️', '📁',
    '📄', '📝', '✉️', '📬', '💬', '📞', '📷', '🎬',
    '🎵', '🎮', '📚', '🎓', '⚙️', '🔧', '🧪', '💻',
    '🌐', '🗺️', '🛒', '🍴', '✈️', '🚗', '⚡', '⭐'
];

const FALLBACK_APPS = [
    { name: 'Money', url: 'https://kumudgupta76.github.io/money/', icon: '💰' }
];

let apps = [];
let importMode = 'merge';
let lastDeleted = null;
let snackbarTimer = null;
let iconTarget = null;
let viewerControlsTimer = null;
let isReordering = false;
let appSortable = null;

// DOM
const $ = (id) => document.getElementById(id);
const appsGrid = $('appsGrid');
const emptyState = $('emptyState');
const appCount = $('appCount');
const topAppBar = $('topAppBar');
const fab = $('addAppBtn');
const menuSheet = $('menuSheet');
const importSheet = $('importSheet');
const addSheet = $('addAppModal');
const editSheet = $('editAppModal');
const installBtn = $('installBtn');
const connectionStatus = $('connectionStatus');
const snackbar = $('snackbar');

// Overlay stack — while anything is open a single history entry is held, so the
// Android back gesture dismisses the overlay instead of leaving the app.
const overlays = [];

async function init() {
    applyTheme(localStorage.getItem(THEME_KEY) || 'system');
    applyLayout(localStorage.getItem(LAYOUT_KEY) || 'grid');
    await loadApps();
    buildEmojiGrid();
    renderApps();
    setupEventListeners();
    registerServiceWorker();
    setupInstallPrompt();
    updateConnectionStatus();
}

/* ---------------------------------------------------------------- data --- */

async function loadApps() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            apps = sanitizeApps(JSON.parse(saved));
            return;
        } catch {
            console.warn('Stored apps were corrupt, reseeding from', APPS_SOURCE);
        }
    }
    apps = await fetchBundledApps();
    saveApps();
}

async function fetchBundledApps() {
    try {
        const response = await fetch(APPS_SOURCE, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return sanitizeApps(await response.json());
    } catch (error) {
        console.warn('Could not load', APPS_SOURCE, error);
        return sanitizeApps(FALLBACK_APPS);
    }
}

function saveApps() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function moveApp(fromIndex, toIndex) {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)
        || fromIndex < 0 || toIndex < 0 || fromIndex >= apps.length
        || toIndex >= apps.length || fromIndex === toIndex) return false;

    const previousOrder = [...apps];
    const [app] = apps.splice(fromIndex, 1);
    apps.splice(toIndex, 0, app);
    try {
        saveApps();
    } catch {
        apps = previousOrder;
        showSnackbar('Could not save app order');
        return false;
    }
    return true;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Accepts either `[ ... ]` or `{ "apps": [ ... ] }` and drops anything unsafe.
function sanitizeApps(raw) {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.apps) ? raw.apps : [];
    return list.map(sanitizeApp).filter(Boolean);
}

function sanitizeApp(entry) {
    if (!entry || typeof entry !== 'object') return null;

    const url = safeUrl(entry.url);
    if (!url) return null;

    const name = String(entry.name ?? '').trim() || getDisplayUrl(url);

    return {
        id: typeof entry.id === 'string' && entry.id ? entry.id : generateId(),
        name: name.slice(0, 60),
        url,
        icon: safeIcon(entry.icon)
    };
}

// Icons are emoji, an http(s) image URL, or a locally stored data URL.
function safeIcon(value) {
    const icon = String(value ?? '').trim();
    if (!icon) return '📱';
    if (/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(icon)) return icon;
    if (icon.includes('://')) return safeUrl(icon) || '📱';
    return icon.slice(0, 8);
}

// Only http(s) survives — blocks javascript:/data: URLs from imported files.
function safeUrl(value) {
    try {
        const parsed = new URL(String(value).trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch {
        return null;
    }
}

function isImageIcon(icon) {
    return typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:image/'));
}

function getDisplayUrl(urlString) {
    try {
        const url = new URL(urlString);
        const host = url.hostname;
        if (/\.(github\.io|netlify\.app|vercel\.app|pages\.dev)$/.test(host)) {
            const first = url.pathname.split('/').filter(Boolean)[0];
            if (first) return first;
        }
        return host.replace(/^www\./, '');
    } catch {
        return urlString;
    }
}

function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

/* -------------------------------------------------------------- render --- */

function renderApps() {
    appCount.textContent = apps.length;
    $('reorderBtn').disabled = apps.length < 2 && !isReordering;

    if (apps.length === 0) {
        appsGrid.innerHTML = '';
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    appsGrid.innerHTML = apps.map(createAppTile).join('');
}

function createAppTile(app, index) {
    const iconMarkup = isImageIcon(app.icon)
        ? `<img src="${escapeHtml(app.icon)}" alt="" loading="lazy" onerror="this.remove()">`
        : escapeHtml(app.icon);

    return `
        <div class="app-item" role="listitem">
            ${isReordering ? `<button type="button" class="icon-button reorder-handle"
                aria-label="Move ${escapeHtml(app.name)}, position ${index + 1} of ${apps.length}"
                aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End"
                title="Move ${escapeHtml(app.name)}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v3H8Zm5 0h3v3h-3ZM8 10.5h3v3H8Zm5 0h3v3h-3ZM8 16h3v3H8Zm5 0h3v3h-3Z"/></svg>
            </button>` : ''}
            <button class="app-tile" type="button"
                    ${isReordering ? 'disabled' : ''}
                    data-id="${escapeHtml(app.id)}"
                    data-url="${escapeHtml(app.url)}"
                    data-name="${escapeHtml(app.name)}"
                    title="${escapeHtml(app.url)}">
                <span class="app-icon">${iconMarkup}</span>
                <span class="app-text">
                    <span class="app-name">${escapeHtml(app.name)}</span>
                    <span class="app-host">${escapeHtml(getDisplayUrl(app.url))}</span>
                </span>
                ${isReordering ? '' : `<span class="tile-edit-btn" role="button" tabindex="0" aria-label="Edit ${escapeHtml(app.name)}" data-edit="${escapeHtml(app.id)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h1.4l8.625-8.625-1.4-1.4L5 17.6ZM19.3 8.925l-4.25-4.2 1.4-1.4q.575-.575 1.413-.575.837 0 1.412.575l1.4 1.4q.575.575.6 1.388.025.812-.55 1.387ZM3 21v-4.25l10.6-10.6 4.25 4.25L7.25 21Z"/></svg>
                </span>`}
            </button>
        </div>
    `;
}

function applyLayout(layout) {
    const isList = layout === 'list';
    appsGrid.classList.toggle('is-list', isList);
    localStorage.setItem(LAYOUT_KEY, layout);

    const button = $('layoutBtn');
    button.setAttribute('aria-label', isList ? 'Switch to grid layout' : 'Switch to list layout');
    $('layoutIcon').innerHTML = isList
        ? '<path d="M4 8V4h4v4Zm6 0V4h4v4Zm6 0V4h4v4ZM4 14v-4h4v4Zm6 0v-4h4v4Zm6 0v-4h4v4ZM4 20v-4h4v4Zm6 0v-4h4v4Zm6 0v-4h4v4Z"/>'
        : '<path d="M3 6V4h18v2Zm0 5V9h18v2Zm0 5v-2h18v2Zm0 5v-2h18v2Z"/>';
}

function toggleLayout() {
    applyLayout(appsGrid.classList.contains('is-list') ? 'grid' : 'list');
}

function buildEmojiGrid() {
    $('emojiGrid').innerHTML = EMOJI_CHOICES
        .map((emoji) => `<button type="button" class="emoji-option" data-emoji="${emoji}">${emoji}</button>`)
        .join('');
}

function setReorderMode(enabled) {
    isReordering = enabled;
    appsGrid.classList.toggle('is-reordering', enabled);
    appSortable.option('disabled', !enabled);
    const button = $('reorderBtn');
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Done reordering' : 'Reorder apps');
    button.title = enabled ? 'Done reordering' : 'Reorder apps';
    $('reorderIcon').innerHTML = enabled
        ? '<path d="m9 16.2-4.2-4.2L3.4 13.4 9 19 21 7l-1.4-1.4Z"/>'
        : '<path d="m7 3-4 4h3v10H3l4 4 4-4H8V7h3ZM13 5h8v2h-8Zm0 6h8v2h-8Zm0 6h8v2h-8Z"/>';
    $('reorderStatus').textContent = enabled ? 'Reorder mode on' : 'Reorder mode off';
    renderApps();
}

function finishAppMove(fromIndex, toIndex) {
    const moved = moveApp(fromIndex, toIndex);
    const focusIndex = moved ? toIndex : fromIndex;
    renderApps();
    appsGrid.children[focusIndex]?.querySelector('.reorder-handle')?.focus({ preventScroll: true });
    if (moved) $('reorderStatus').textContent = `${apps[toIndex].name}, position ${toIndex + 1} of ${apps.length}`;
}

function setupAppReordering() {
    appSortable = new Sortable(appsGrid, {
        disabled: true,
        draggable: '.app-item',
        handle: '.reorder-handle',
        animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150,
        forceFallback: true,
        fallbackTolerance: 5,
        ghostClass: 'is-drag-placeholder',
        chosenClass: 'is-drag-chosen',
        onEnd: ({ oldDraggableIndex, newDraggableIndex }) => finishAppMove(oldDraggableIndex, newDraggableIndex)
    });
    $('reorderBtn').addEventListener('click', () => setReorderMode(!isReordering));
    appsGrid.addEventListener('keydown', (event) => {
        const handle = event.target.closest('.reorder-handle');
        if (!isReordering || !handle) return;
        const items = [...appsGrid.children];
        const fromIndex = items.indexOf(handle.closest('.app-item'));
        const columns = appsGrid.classList.contains('is-list') ? 1
            : items.filter((item) => item.offsetTop === items[0].offsetTop).length;
        const destinations = {
            ArrowLeft: fromIndex - 1, ArrowRight: fromIndex + 1,
            ArrowUp: fromIndex - columns, ArrowDown: fromIndex + columns,
            Home: 0, End: apps.length - 1
        };
        if (!(event.key in destinations)) return;
        event.preventDefault();
        finishAppMove(fromIndex, Math.max(0, Math.min(apps.length - 1, destinations[event.key])));
        document.activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
}

/* --------------------------------------------------------------- sheets --- */

function openSheet(el) {
    if (isReordering) setReorderMode(false);
    if (overlays.includes(el)) return;
    el.hidden = false;
    el.classList.remove('is-closing');
    if (overlays.length === 0) history.pushState({ overlay: true }, '');
    overlays.push(el);
    document.body.style.overflow = 'hidden';
}

// Swaps the visible sheet in place, keeping the same history entry.
function switchSheet(from, to) {
    const index = overlays.indexOf(from);
    dismissOverlay(from);
    to.hidden = false;
    to.classList.remove('is-closing');
    overlays.splice(index === -1 ? overlays.length : index, 0, to);
    document.body.style.overflow = 'hidden';
}

// User-initiated close: unwind through history so the back stack stays in sync.
function closeSheet(el) {
    if (!el || !overlays.includes(el)) return;
    if (overlays.length === 1) {
        history.back();
        return;
    }
    dismissOverlay(el);
}

function dismissOverlay(el) {
    if (el.classList.contains('app-viewer')) {
        clearTimeout(viewerControlsTimer);
        el.hidden = true;
        $('appFrame').src = 'about:blank';
    } else {
        el.classList.add('is-closing');
        setTimeout(() => {
            el.hidden = true;
            el.classList.remove('is-closing');
        }, 240);
    }

    const index = overlays.indexOf(el);
    if (index !== -1) overlays.splice(index, 1);
    if (overlays.length === 0) document.body.style.overflow = '';
}

/* ------------------------------------------------------------- listeners --- */

function setupEventListeners() {
    appsGrid.addEventListener('click', handleGridClick);
    setupLongPress();
    setupAppReordering();

    $('layoutBtn').addEventListener('click', toggleLayout);

    fab.addEventListener('click', openAddSheet);
    $('closeModalBtn').addEventListener('click', () => closeSheet(addSheet));
    $('cancelBtn').addEventListener('click', () => closeSheet(addSheet));
    $('addAppForm').addEventListener('submit', handleAddApp);
    $('fetchMetaBtn').addEventListener('click', handleFetchMetadata);

    $('closeEditModalBtn').addEventListener('click', () => closeSheet(editSheet));
    $('editAppForm').addEventListener('submit', handleEditApp);
    $('deleteAppBtn').addEventListener('click', handleDeleteApp);

    $('menuBtn').addEventListener('click', () => openSheet(menuSheet));
    $('menuImportBtn').addEventListener('click', () => switchSheet(menuSheet, importSheet));
    $('menuExportBtn').addEventListener('click', handleExport);
    $('menuThemeBtn').addEventListener('click', cycleTheme);
    $('menuResetBtn').addEventListener('click', handleReset);

    $('emptyImportBtn').addEventListener('click', () => openSheet(importSheet));
    $('pickFileBtn').addEventListener('click', () => $('importFileInput').click());
    $('importFileInput').addEventListener('change', handleFileImport);
    $('loadBundledBtn').addEventListener('click', handleBundledImport);

    setupIconPicker();

    document.querySelectorAll('[data-import-mode]').forEach((segment) => {
        segment.addEventListener('click', () => {
            importMode = segment.dataset.importMode;
            document.querySelectorAll('[data-import-mode]').forEach((other) => {
                const selected = other === segment;
                other.classList.toggle('is-selected', selected);
                other.setAttribute('aria-checked', String(selected));
            });
        });
    });

    document.querySelectorAll('[data-close-sheet]').forEach((el) => {
        el.addEventListener('click', () => closeSheet(el.closest('.sheet-container')));
    });

    $('homeBtn').addEventListener('click', closeAppViewer);
    $('showViewerControlsBtn').addEventListener('click', () => {
        showViewerControls();
        $('homeBtn').focus({ preventScroll: true });
    });
    $('viewerControls').addEventListener('pointerdown', showViewerControls);
    $('viewerControls').addEventListener('focusin', showViewerControls);

    window.addEventListener('popstate', () => {
        const top = overlays[overlays.length - 1];
        if (!top) return;
        dismissOverlay(top);
        if (overlays.length > 0) history.pushState({ overlay: true }, '');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isReordering) {
                setReorderMode(false);
                $('reorderBtn').focus();
                return;
            }
            closeSheet(overlays[overlays.length - 1]);
        }
    });

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        topAppBar.classList.toggle('is-scrolled', y > 4);
        fab.classList.toggle('is-collapsed', y > lastScroll && y > 80);
        lastScroll = y;
    }, { passive: true });

    document.addEventListener('pointerdown', addRipple);

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

function addRipple(e) {
    const target = e.target.closest('.app-tile, .btn, .icon-button, .menu-item, .fab, .segment');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.width = ink.style.height = `${size}px`;
    ink.style.left = `${e.clientX - rect.left - size / 2}px`;
    ink.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ink);
    setTimeout(() => ink.remove(), 400);
}

/* ------------------------------------------------------------ tile input --- */

function handleGridClick(e) {
    if (isReordering) return;
    const editTrigger = e.target.closest('[data-edit]');
    if (editTrigger) {
        e.preventDefault();
        e.stopPropagation();
        openEditSheet(editTrigger.dataset.edit);
        return;
    }

    const tile = e.target.closest('.app-tile');
    if (!tile || tile.dataset.suppressClick === '1') return;
    openAppViewer(tile.dataset.url, tile.dataset.name);
}

// Long-press opens the editor, matching Android launcher behaviour.
function setupLongPress() {
    let timer = null;
    let activeTile = null;

    const cancel = () => {
        clearTimeout(timer);
        if (activeTile) activeTile.classList.remove('is-pressed');
        activeTile = null;
    };

    appsGrid.addEventListener('pointerdown', (e) => {
        if (isReordering) return;
        const tile = e.target.closest('.app-tile');
        if (!tile || e.target.closest('[data-edit]')) return;

        activeTile = tile;
        tile.classList.add('is-pressed');
        tile.dataset.suppressClick = '0';
        timer = setTimeout(() => {
            tile.dataset.suppressClick = '1';
            navigator.vibrate?.(15);
            openEditSheet(tile.dataset.id);
            cancel();
        }, 500);
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => {
        appsGrid.addEventListener(evt, cancel);
    });
    appsGrid.addEventListener('pointermove', (e) => {
        if (activeTile && (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4)) cancel();
    });
}

/* ------------------------------------------------------------ add / edit --- */

function openAddSheet() {
    $('addAppForm').reset();
    setIconValue('add', '');
    openSheet(addSheet);
    setTimeout(() => $('appUrl').focus(), 120);
}

function openEditSheet(appId) {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;

    $('editAppId').value = app.id;
    $('editAppName').value = app.name;
    $('editAppUrl').value = app.url;
    setIconValue('edit', app.icon);
    openSheet(editSheet);
}

function handleAddApp(e) {
    e.preventDefault();

    const app = sanitizeApp({
        name: $('appName').value,
        url: $('appUrl').value,
        icon: $('appIcon').value
    });

    if (!app) {
        showSnackbar('That URL is not valid');
        return;
    }

    apps.push(app);
    saveApps();
    renderApps();
    closeSheet(addSheet);
    showSnackbar(`${app.name} added`);
}

function handleEditApp(e) {
    e.preventDefault();

    const id = $('editAppId').value;
    const index = apps.findIndex((a) => a.id === id);
    if (index === -1) return;

    const updated = sanitizeApp({
        id,
        name: $('editAppName').value,
        url: $('editAppUrl').value,
        icon: $('editAppIcon').value
    });

    if (!updated) {
        showSnackbar('That URL is not valid');
        return;
    }

    apps[index] = updated;
    saveApps();
    renderApps();
    closeSheet(editSheet);
    showSnackbar('Changes saved');
}

function handleDeleteApp() {
    const id = $('editAppId').value;
    const index = apps.findIndex((a) => a.id === id);
    if (index === -1) return;

    lastDeleted = { app: apps[index], index };
    apps.splice(index, 1);
    saveApps();
    renderApps();
    closeSheet(editSheet);

    showSnackbar(`${lastDeleted.app.name} removed`, 'Undo', () => {
        apps.splice(lastDeleted.index, 0, lastDeleted.app);
        saveApps();
        renderApps();
        lastDeleted = null;
    });
}

/* ------------------------------------------------------- import / export --- */

async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const imported = sanitizeApps(JSON.parse(await file.text()));
        applyImport(imported, file.name);
    } catch (error) {
        console.error(error);
        showSnackbar('That file is not valid JSON');
    } finally {
        e.target.value = '';
    }
}

async function handleBundledImport() {
    applyImport(await fetchBundledApps(), 'data/apps.json');
}

function applyImport(imported, sourceLabel) {
    if (imported.length === 0) {
        showSnackbar(`No usable apps found in ${sourceLabel}`);
        return;
    }

    let added = imported.length;

    if (importMode === 'replace') {
        apps = imported;
    } else {
        const existing = new Set(apps.map((a) => a.url));
        const fresh = imported.filter((a) => !existing.has(a.url));
        added = fresh.length;
        apps = apps.concat(fresh);
    }

    saveApps();
    renderApps();
    closeSheet(importSheet);
    showSnackbar(importMode === 'replace'
        ? `Replaced with ${added} app${added === 1 ? '' : 's'}`
        : added > 0 ? `Added ${added} app${added === 1 ? '' : 's'}` : 'All apps were already added');
}

function handleExport() {
    const blob = new Blob([JSON.stringify({ version: 1, apps }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'apps.json';
    link.click();
    URL.revokeObjectURL(url);
    closeSheet(menuSheet);
    showSnackbar('apps.json downloaded');
}

async function handleReset() {
    closeSheet(menuSheet);
    if (!confirm('Replace your list with the bundled data/apps.json?')) return;

    apps = await fetchBundledApps();
    saveApps();
    renderApps();
    showSnackbar('Apps restored');
}

/* ---------------------------------------------------------------- theme --- */

function applyTheme(mode) {
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);

    localStorage.setItem(THEME_KEY, mode);
    $('themeLabel').textContent = { system: 'Follow system', light: 'Light', dark: 'Dark' }[mode];
}

function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    const current = localStorage.getItem(THEME_KEY) || 'system';
    applyTheme(order[(order.indexOf(current) + 1) % order.length]);
}

/* ------------------------------------------------------------- metadata --- */

async function fetchSiteMetadata(url) {
    const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
    let title = '';

    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data.contents) {
            title = data.contents.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1].trim() || '';

            const appleIcon = data.contents.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)
                || data.contents.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);

            if (appleIcon?.[1]) {
                const resolved = new URL(appleIcon[1], url).href;
                return { icon: safeUrl(resolved) || faviconUrl, title };
            }
        }
    } catch {
        console.log('Falling back to favicon only');
    }

    return { icon: faviconUrl, title };
}

async function handleFetchMetadata() {
    const urlInput = $('appUrl');
    const nameInput = $('appName');
    const fetchBtn = $('fetchMetaBtn');

    if (!safeUrl(urlInput.value)) {
        showSnackbar('Enter a valid http(s) URL first');
        return;
    }

    fetchBtn.disabled = true;
    try {
        const meta = await fetchSiteMetadata(urlInput.value.trim());
        if (meta.icon && !$('appIcon').value) setIconValue('add', await storeIconLocally(meta.icon));
        if (meta.title && !nameInput.value) nameInput.value = meta.title;
        showSnackbar('Details fetched');
    } finally {
        fetchBtn.disabled = false;
    }
}

/* ----------------------------------------------------------- icon picker --- */

function setupIconPicker() {
    document.querySelectorAll('[data-icon-picker]').forEach((btn) => {
        btn.addEventListener('click', () => openIconPicker(btn.dataset.iconPicker));
    });

    document.querySelectorAll('[data-icon-tab]').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('[data-icon-tab]').forEach((other) => {
                const selected = other === tab;
                other.classList.toggle('is-selected', selected);
                other.setAttribute('aria-selected', String(selected));
            });
            document.querySelectorAll('[data-icon-panel]').forEach((panel) => {
                panel.hidden = panel.dataset.iconPanel !== tab.dataset.iconTab;
            });
        });
    });

    $('iconSearchBtn').addEventListener('click', runIconSearch);
    $('iconSearchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runIconSearch();
        }
    });

    $('iconResults').addEventListener('click', async (e) => {
        const option = e.target.closest('[data-icon-url]');
        if (!option) return;
        option.classList.add('is-busy');
        await chooseIcon(await storeIconLocally(option.dataset.iconUrl));
    });

    $('emojiGrid').addEventListener('click', (e) => {
        const option = e.target.closest('[data-emoji]');
        if (option) chooseIcon(option.dataset.emoji);
    });

    $('iconUploadBtn').addEventListener('click', () => $('iconFileInput').click());
    $('iconFileInput').addEventListener('change', handleIconUpload);
}

function openIconPicker(target) {
    iconTarget = target;
    $('iconResults').innerHTML = '';

    const urlValue = target === 'add' ? $('appUrl').value : $('editAppUrl').value;
    const host = safeUrl(urlValue) ? new URL(urlValue).hostname : '';
    $('iconSearchInput').value = host;

    openSheet($('iconSheet'));
    if (host) runIconSearch();
}

function chooseIcon(value) {
    setIconValue(iconTarget, value);
    closeSheet($('iconSheet'));
}

function setIconValue(target, value) {
    const icon = safeIcon(value);
    const prefix = target === 'edit' ? 'edit' : 'add';
    const input = prefix === 'edit' ? $('editAppIcon') : $('appIcon');
    const preview = $(`${prefix}IconPreview`);

    input.value = icon;
    preview.innerHTML = isImageIcon(icon)
        ? `<img src="${escapeHtml(icon)}" alt="">`
        : escapeHtml(icon);
    $(`${prefix}IconValue`).textContent = icon.startsWith('data:')
        ? 'Saved on this device'
        : isImageIcon(icon) ? 'Linked image' : 'Emoji';
}

// Well-known favicon/logo endpoints, tried in parallel; broken ones remove themselves.
function iconCandidates(query) {
    const term = query.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!term) return [];

    const domain = term.includes('.') ? term : `${term}.com`;
    return [
        `https://icon.horse/icon/${domain}`,
        `https://logo.clearbit.com/${domain}`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
        `https://${domain}/apple-touch-icon.png`,
        `https://${domain}/favicon.ico`
    ];
}

function runIconSearch() {
    const query = $('iconSearchInput').value.trim();
    const results = $('iconResults');

    if (!query) {
        results.innerHTML = '';
        return;
    }

    const direct = safeUrl(query);
    const urls = direct ? [direct, ...iconCandidates(query)] : iconCandidates(query);

    results.innerHTML = urls
        .map((url) => `
            <button type="button" class="icon-option" data-icon-url="${escapeHtml(url)}" title="${escapeHtml(url)}">
                <img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.closest('.icon-option').remove()">
            </button>
        `)
        .join('');
}

// Downloads the icon and keeps a copy as a data URL; falls back to the remote URL on CORS failure.
async function storeIconLocally(url) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await shrinkToDataUrl(await response.blob());
    } catch {
        showSnackbar('Could not save a local copy — using the link');
        return url;
    }
}

function shrinkToDataUrl(blob, size = 128) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            const scale = Math.min(1, size / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Icon could not be decoded'));
        };
        image.src = objectUrl;
    });
}

async function handleIconUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        chooseIcon(await shrinkToDataUrl(file));
    } catch {
        showSnackbar('That image could not be read');
    } finally {
        e.target.value = '';
    }
}

/* -------------------------------------------------------------- snackbar --- */

function showSnackbar(message, actionLabel, actionFn) {
    clearTimeout(snackbarTimer);
    snackbar.classList.remove('is-update');

    $('snackbarText').textContent = message;
    const actionBtn = $('snackbarAction');
    actionBtn.hidden = !actionLabel;

    if (actionLabel) {
        actionBtn.textContent = actionLabel;
        actionBtn.onclick = () => {
            actionFn?.();
            snackbar.hidden = true;
        };
    }

    snackbar.hidden = false;
    snackbarTimer = setTimeout(() => { snackbar.hidden = true; }, actionLabel ? 6000 : 3000);
}

/* ---------------------------------------------------------------- viewer --- */

function openAppViewer(url, name) {
    const viewer = $('appViewer');
    if (!safeUrl(url)) return;

    $('viewerTitle').textContent = name;
    $('openExternalBtn').href = url;
    $('appFrame').src = url;
    openSheet(viewer);
    showViewerControls();
}

function showViewerControls() {
    clearTimeout(viewerControlsTimer);
    const controls = $('viewerControls');
    const revealButton = $('showViewerControlsBtn');
    controls.hidden = false;
    revealButton.hidden = true;
    viewerControlsTimer = setTimeout(() => {
        const restoreFocus = controls.contains(document.activeElement);
        controls.hidden = true;
        revealButton.hidden = false;
        if (restoreFocus) revealButton.focus({ preventScroll: true });
    }, 2000);
}

function closeAppViewer() {
    dismissOverlay($('appViewer'));
    if (overlays.length === 0) history.replaceState(null, '');
}

/* ------------------------------------------------------------ pwa plumbing --- */

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        let reloadRequested = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloadRequested) location.reload();
        });
        const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
        const offerUpdate = () => {
            if (!registration.waiting || !navigator.serviceWorker.controller) return;
            showSnackbar('Dock update ready', 'Reload', () => {
                if (!registration.waiting) return;
                reloadRequested = true;
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            });
            clearTimeout(snackbarTimer);
            snackbar.classList.add('is-update');
        };
        const watchInstall = () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed') offerUpdate();
            });
        };
        registration.addEventListener('updatefound', watchInstall);
        watchInstall();
        offerUpdate();
        const checkForUpdate = () => {
            if (document.visibilityState !== 'visible') return;
            offerUpdate();
            if (navigator.onLine) registration.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
    } catch (error) {
        console.error('Service Worker registration failed:', error);
    }
}

let deferredPrompt;

function isInstalledPWA() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');
}

function setupInstallPrompt() {
    if (isInstalledPWA()) {
        installBtn.hidden = true;
        return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.hidden = false;
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
        installBtn.hidden = true;
        deferredPrompt = null;
    });
}

function updateConnectionStatus() {
    connectionStatus.textContent = navigator.onLine ? 'Online' : 'Offline';
    document.body.classList.toggle('offline', !navigator.onLine);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
