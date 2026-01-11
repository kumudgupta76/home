// PWA Home Dashboard - Main Application

// Default sample apps
const defaultApps = [
    {
        id: '1',
        name: 'Gmail',
        url: 'https://mail.google.com',
        icon: '📧',
        color: '#ea4335'
    },
    {
        id: '2',
        name: 'GitHub',
        url: 'https://github.com',
        icon: '🐙',
        color: '#24292e'
    },
    {
        id: '3',
        name: 'YouTube',
        url: 'https://youtube.com',
        icon: '▶️',
        color: '#ff0000'
    },
    {
        id: '4',
        name: 'Google Drive',
        url: 'https://drive.google.com',
        icon: '📁',
        color: '#4285f4'
    },
    {
        id: '5',
        name: 'Calendar',
        url: 'https://calendar.google.com',
        icon: '📅',
        color: '#34a853'
    },
    {
        id: '6',
        name: 'Notion',
        url: 'https://notion.so',
        icon: '📝',
        color: '#000000'
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
}

// Create app card HTML
function createAppCard(app) {
    const iconContent = isUrl(app.icon) 
        ? `<img src="${escapeHtml(app.icon)}" alt="${escapeHtml(app.name)}" onerror="this.parentElement.innerHTML='📱'">`
        : escapeHtml(app.icon) || '📱';
    
    const displayUrl = new URL(app.url).hostname;
    
    return `
        <a href="${escapeHtml(app.url)}" 
           class="app-card" 
           target="_blank" 
           rel="noopener noreferrer"
           style="--app-color: ${escapeHtml(app.color)}">
            <button class="edit-btn" data-id="${escapeHtml(app.id)}" title="Edit app">⚙️</button>
            <div class="app-icon" style="background: ${escapeHtml(app.color)}">
                ${iconContent}
            </div>
            <span class="app-name">${escapeHtml(app.name)}</span>
            <span class="app-url">${escapeHtml(displayUrl)}</span>
        </a>
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
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddModal();
            closeEditModal();
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

function setupInstallPrompt() {
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
