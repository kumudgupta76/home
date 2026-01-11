// PWA Home Dashboard - Main Application

// Default sample apps
const defaultApps = [
    {
        id: '1',
        name: 'Money',
        url: 'https://kumudgupta76.github.io/money/',
        icon: '💰',
        color: '#4caf50'
    }
];

// App State
let apps = [];

// DOM Elements
const appsGrid = document.getElementById('appsGrid');
const searchInput = document.getElementById('searchInput');
const addAppBtn = document.getElementById('addAppBtn');
const addAppModal = document.getElementById('addAppModal');
const addAppForm = document.getElementById('addAppForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const editAppModal = document.getElementById('editAppModal');
const editAppForm = document.getElementById('editAppForm');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const deleteAppBtn = document.getElementById('deleteAppBtn');
const installBtn = document.getElementById('installBtn');
const connectionStatus = document.getElementById('connectionStatus');

// Initialize App
function init() {
    loadApps();
    renderApps();
    setupEventListeners();
    registerServiceWorker();
    setupInstallPrompt();
    updateConnectionStatus();
}

// Load apps from localStorage
function loadApps() {
    const savedApps = localStorage.getItem('pwa-home-apps');
    if (savedApps) {
        apps = JSON.parse(savedApps);
    } else {
        apps = [...defaultApps];
        saveApps();
    }
}

// Save apps to localStorage
function saveApps() {
    localStorage.setItem('pwa-home-apps', JSON.stringify(apps));
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Render apps to the grid
function renderApps(filteredApps = null) {
    const appsToRender = filteredApps || apps;
    
    if (appsToRender.length === 0) {
        appsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📱</div>
                <h3>No apps yet</h3>
                <p>Click "Add New App" to get started</p>
            </div>
        `;
        return;
    }

    appsGrid.innerHTML = appsToRender.map(app => createAppCard(app)).join('');
    
    // Add click event listeners for edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const appId = btn.dataset.id;
            openEditModal(appId);
        });
    });
    
    // Add click event listeners for app cards
    document.querySelectorAll('.app-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open if clicking edit button
            if (e.target.closest('.edit-btn')) return;
            
            const url = card.dataset.url;
            const name = card.dataset.name;
            openAppViewer(url, name);
        });
        
        // Allow keyboard activation
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const url = card.dataset.url;
                const name = card.dataset.name;
                openAppViewer(url, name);
            }
        });
    });
}

// Create app card HTML
function createAppCard(app) {
    const iconContent = isUrl(app.icon) 
        ? `<img src="${escapeHtml(app.icon)}" alt="${escapeHtml(app.name)}" onerror="this.parentElement.innerHTML='📱'">`
        : escapeHtml(app.icon) || '📱';
    
    const displayUrl = getDisplayUrl(app.url);
    const fullUrl = new URL(app.url).href;
    
    return `
        <div class="app-card" 
           data-url="${escapeHtml(app.url)}"
           data-name="${escapeHtml(app.name)}"
           role="button"
           tabindex="0"
           title="${escapeHtml(fullUrl)}"
           style="--app-color: ${escapeHtml(app.color)}">
            <button class="edit-btn" data-id="${escapeHtml(app.id)}" title="Edit app">⚙️</button>
            <div class="app-icon" style="background: ${escapeHtml(app.color)}">
                ${iconContent}
            </div>
            <span class="app-name">${escapeHtml(app.name)}</span>
            <span class="app-url">${escapeHtml(displayUrl)}</span>
            <span class="app-full-url">${escapeHtml(fullUrl)}</span>
        </div>
    `;
}

// Check if string is a URL
function isUrl(string) {
    if (!string) return false;
    try {
        new URL(string);
        return string.startsWith('http://') || string.startsWith('https://');
    } catch {
        return false;
    }
}

// Get a meaningful display URL
function getDisplayUrl(urlString) {
    try {
        const url = new URL(urlString);
        const hostname = url.hostname;
        
        // For GitHub Pages or similar, show the path instead
        if (hostname.endsWith('.github.io') || hostname.endsWith('.netlify.app') || hostname.endsWith('.vercel.app')) {
            const pathParts = url.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                return pathParts[0]; // Return first path segment (repo name)
            }
        }
        
        // For regular domains, remove www. prefix
        return hostname.replace(/^www\./, '');
    } catch {
        return urlString;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', handleSearch);
    
    // Add App Modal
    addAppBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);
    addAppForm.addEventListener('submit', handleAddApp);
    
    // Fetch metadata button
    const fetchMetaBtn = document.getElementById('fetchMetaBtn');
    if (fetchMetaBtn) {
        fetchMetaBtn.addEventListener('click', handleFetchMetadata);
    }
    
    // Edit App Modal
    closeEditModalBtn.addEventListener('click', closeEditModal);
    editAppForm.addEventListener('submit', handleEditApp);
    deleteAppBtn.addEventListener('click', handleDeleteApp);
    
    // Close modals on backdrop click
    addAppModal.addEventListener('click', (e) => {
        if (e.target === addAppModal) closeAddModal();
    });
    editAppModal.addEventListener('click', (e) => {
        if (e.target === editAppModal) closeEditModal();
    });
    
    // App Viewer
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', closeAppViewer);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddModal();
            closeEditModal();
            closeAppViewer();
        }
        // Focus search on Ctrl+K or Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });
    
    // Online/Offline status
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

// Search handler
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
        renderApps();
        return;
    }
    
    const filtered = apps.filter(app => 
        app.name.toLowerCase().includes(query) || 
        app.url.toLowerCase().includes(query)
    );
    renderApps(filtered);
}

// Modal handlers
function openAddModal() {
    addAppForm.reset();
    addAppModal.hidden = false;
    document.getElementById('appName').focus();
}

function closeAddModal() {
    addAppModal.hidden = true;
    addAppForm.reset();
}

function openEditModal(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;
    
    document.getElementById('editAppId').value = app.id;
    document.getElementById('editAppName').value = app.name;
    document.getElementById('editAppUrl').value = app.url;
    document.getElementById('editAppIcon').value = app.icon;
    document.getElementById('editAppColor').value = app.color;
    
    editAppModal.hidden = false;
    document.getElementById('editAppName').focus();
}

function closeEditModal() {
    editAppModal.hidden = true;
    editAppForm.reset();
}

// Fetch site metadata (icon and title)
async function fetchSiteMetadata(url) {
    try {
        // Get favicon using Google's service
        const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
        
        // Try to fetch title using a CORS proxy
        let title = '';
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (data.contents) {
                // Parse title from HTML
                const titleMatch = data.contents.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }
                
                // Try to get a better icon from meta tags
                const ogImageMatch = data.contents.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
                    || data.contents.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
                
                const appleTouchIcon = data.contents.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)
                    || data.contents.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);
                
                if (appleTouchIcon && appleTouchIcon[1]) {
                    const iconPath = appleTouchIcon[1];
                    const baseUrl = new URL(url);
                    return {
                        icon: iconPath.startsWith('http') ? iconPath : `${baseUrl.origin}${iconPath.startsWith('/') ? '' : '/'}${iconPath}`,
                        title
                    };
                }
            }
        } catch (e) {
            console.log('Could not fetch page metadata, using favicon only');
        }
        
        return { icon: faviconUrl, title };
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return { icon: '', title: '' };
    }
}

// Handle fetch metadata button click
async function handleFetchMetadata() {
    const urlInput = document.getElementById('appUrl');
    const nameInput = document.getElementById('appName');
    const iconInput = document.getElementById('appIcon');
    const fetchBtn = document.getElementById('fetchMetaBtn');
    
    const url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a URL first');
        return;
    }
    
    // Show loading state
    fetchBtn.textContent = '⏳';
    fetchBtn.disabled = true;
    
    try {
        const metadata = await fetchSiteMetadata(url);
        
        if (metadata.icon && !iconInput.value) {
            iconInput.value = metadata.icon;
        }
        if (metadata.title && !nameInput.value) {
            nameInput.value = metadata.title;
        }
    } finally {
        fetchBtn.textContent = '🔍';
        fetchBtn.disabled = false;
    }
}

// Add new app
function handleAddApp(e) {
    e.preventDefault();
    
    const newApp = {
        id: generateId(),
        name: document.getElementById('appName').value.trim(),
        url: document.getElementById('appUrl').value.trim(),
        icon: document.getElementById('appIcon').value.trim() || '📱',
        color: document.getElementById('appColor').value
    };
    
    apps.push(newApp);
    saveApps();
    renderApps();
    closeAddModal();
}

// Edit existing app
function handleEditApp(e) {
    e.preventDefault();
    
    const appId = document.getElementById('editAppId').value;
    const appIndex = apps.findIndex(a => a.id === appId);
    
    if (appIndex === -1) return;
    
    apps[appIndex] = {
        ...apps[appIndex],
        name: document.getElementById('editAppName').value.trim(),
        url: document.getElementById('editAppUrl').value.trim(),
        icon: document.getElementById('editAppIcon').value.trim() || '📱',
        color: document.getElementById('editAppColor').value
    };
    
    saveApps();
    renderApps();
    closeEditModal();
}

// Delete app
function handleDeleteApp() {
    const appId = document.getElementById('editAppId').value;
    const app = apps.find(a => a.id === appId);
    
    if (app && confirm(`Are you sure you want to delete "${app.name}"?`)) {
        apps = apps.filter(a => a.id !== appId);
        saveApps();
        renderApps();
        closeEditModal();
    }
}

// Register Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered:', registration.scope);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// PWA Install Prompt
let deferredPrompt;

// Check if app is running as installed PWA
function isInstalledPWA() {
    return window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone === true
        || document.referrer.includes('android-app://');
}

function setupInstallPrompt() {
    // Don't show install button if already installed
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
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);
        deferredPrompt = null;
        installBtn.hidden = true;
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        installBtn.hidden = true;
        deferredPrompt = null;
    });
}

// Update connection status
function updateConnectionStatus() {
    if (navigator.onLine) {
        connectionStatus.textContent = '🟢 Online';
        document.body.classList.remove('offline');
    } else {
        connectionStatus.textContent = '🔴 Offline';
        document.body.classList.add('offline');
    }
}

// App Viewer functions
function openAppViewer(url, name) {
    const appViewer = document.getElementById('appViewer');
    const appFrame = document.getElementById('appFrame');
    const viewerTitle = document.getElementById('viewerTitle');
    const openExternalBtn = document.getElementById('openExternalBtn');
    
    if (!appViewer || !appFrame) return;
    
    viewerTitle.textContent = name;
    openExternalBtn.href = url;
    appFrame.src = url;
    appViewer.hidden = false;
    
    // Hide main content
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
}

function closeAppViewer() {
    const appViewer = document.getElementById('appViewer');
    const appFrame = document.getElementById('appFrame');
    
    if (!appViewer) return;
    
    appViewer.hidden = true;
    appFrame.src = 'about:blank';
    
    // Show main content
    document.querySelector('.header').style.display = '';
    document.querySelector('.main-content').style.display = '';
    document.querySelector('.footer').style.display = '';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
