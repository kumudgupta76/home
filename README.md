# Dock

A Progressive Web App (PWA) that serves as a personal home page and launcher for your web applications.

![PWA](https://img.shields.io/badge/PWA-Ready-blue) ![Offline](https://img.shields.io/badge/Offline-Supported-green) ![Installable](https://img.shields.io/badge/Installable-Yes-purple)

---

## 📋 Table of Contents

- [Features](#-features)
- [How to Refresh / Update](#-how-to-refresh--update)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Technical Design](#-technical-design)
- [Customization](#-customization)
- [Deployment](#-deployment)
- [Browser Support](#-browser-support)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📱 **Installable** | Install as a standalone app on Windows, macOS, Android, iOS |
| 🔌 **Offline Support** | Works without internet using Service Worker caching |
| ⬛ **Layouts** | Switch between a launcher grid and a horizontal list |
| **Reorder Apps** | Drag with mouse or touch, or use the keyboard; both layouts share your saved order |
| ➕ **Add Apps** | Add any web app with a name, URL and icon |
| 🎨 **Icon Picker** | Search the web for an icon, pick an emoji, or upload one — saved locally |
| 📄 **JSON Import/Export** | Bulk-add apps from `data/apps.json` or any JSON file |
| 🔄 **Auto-fetch Metadata** | Automatically fetches site title and favicon from URL |
| ✏️ **Edit & Delete** | Manage your apps easily with edit/delete options |
| 🖼️ **Embedded Viewer** | Opens apps within the PWA (no browser redirect) |
| 🌓 **Dark Mode** | Automatic dark mode based on system preference |
| 📱 **Responsive** | Works on all screen sizes (mobile, tablet, desktop) |
| 💾 **Persistent Storage** | Apps saved in localStorage, persists across sessions |

---

## 🔄 How to Refresh / Update

Dock checks for updates on launch, when returning to the app, and when reconnecting.
When **Dock update ready** appears, select **Reload** to apply the cached release.
Updates wait until you accept or close all Dock windows; they do not interrupt an
open app automatically. Saved apps and preferences remain in localStorage.
For the first upgrade from the older worker, close all Dock windows and reopen.

### When Running in Browser

1. **Hard Refresh**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Cache**: 
   - Open DevTools (`F12`)
   - Go to **Application** → **Storage** → Click **Clear site data**
3. **Update Service Worker**:
   - Open DevTools (`F12`)
   - Go to **Application** → **Service Workers**
   - Click **Update** or check **Update on reload**

### When Installed as PWA (Windows/Desktop)

1. **Force Update**:
   - Close the PWA completely
   - Reopen it - the service worker will check for updates
   
2. **Manual Refresh**:
   - Inside the PWA, use `Ctrl+Shift+R`
   
3. **Full Reset** (if updates don't appear):
   - Uninstall the PWA: **Settings** → **Apps** → Find "PWA Home" → **Uninstall**
   - Clear browser data for the site
   - Reinstall from browser

### When Installed on Mobile

1. **Android**: Close app completely, reopen. If still old, uninstall and reinstall.
2. **iOS**: Close app from app switcher, reopen. May need to delete and re-add to home screen.

### Clear App Data (Reset to Defaults)

To clear saved apps and start fresh:

1. Open DevTools (`F12`)
2. Go to **Application** → **Local Storage**
3. Delete `pwa-home-apps` key
4. Refresh the page

---

## 📥 Installation

### As PWA (Recommended)

1. Visit the deployed URL in Chrome/Edge
2. Click the **📲 Install App** button in the header
3. Or click the install icon in the browser address bar
4. The app will be added to your desktop/home screen

### For Development

```bash
# Clone the repository
git clone https://github.com/kumudgupta76/home.git
cd home

# Serve locally (choose one method)

# Method 1: Python
python -m http.server 8080

# Method 2: Node.js
npx serve .

# Method 3: VS Code Live Server
# Right-click index.html → Open with Live Server
```

---

## 🎯 Usage

### Adding an App

1. Click **+ Add New App** button
2. Enter the **App URL** (e.g., `https://kumudgupta76.github.io/money/`)
3. Click **🔍** to auto-fetch title and icon
4. Adjust name, icon (emoji or image URL), and color
5. Click **Add App**

### Opening an App

- **Click** on any app tile to open it in the embedded viewer
- Use the **Home** button in the bottom toolbar to view all apps
- Click **↗** to open in external browser

### Editing/Deleting an App

1. Hover over an app tile
2. Click the **⚙️** button
3. Edit details or click **Delete**

### Reordering Apps

1. Select **Reorder apps** beside the app count.
2. Drag an app's handle to its new position in either grid or list layout.
3. Select the checkmark (**Done reordering**) or press `Escape` to finish.

Changes save immediately on this device and survive layout switches and reloads.
With a handle focused, use arrow keys to move an app, or `Home` / `End` to move it
to the first / last position. Up and down move by a row in grid layout.
Normal taps and long-press editing resume when you leave Reorder mode.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Focus search input |
| `Escape` | Exit Reorder mode, or close modal or app viewer |

---

## 📁 Project Structure

```
home/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest (installability)
├── sw.js                   # Service Worker (offline support)
├── README.md               # This file
│
├── css/
│   └── styles.css          # All styles (responsive + dark mode)
│
├── js/
│   └── app.js              # Main application logic
│
├── icons/
│   ├── icon-128.png        # App icon 128x128
│   ├── icon-192.png        # App icon 192x192
│   └── icon-512.png        # App icon 512x512
│
└── .github/
    ├── copilot-instructions.md
    └── workflows/
        └── deploy.yml      # GitHub Actions deployment
```

---

## 🏗️ Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        PWA Home                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   index.html │  │  styles.css │  │      app.js         │ │
│  │   (Structure)│  │  (Styling)  │  │  (Logic & State)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Service Worker (sw.js)               ││
│  │  • Caches static assets for offline use                 ││
│  │  • Serves cached content when offline                   ││
│  │  • Updates cache in background                          ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    localStorage                          ││
│  │  • Stores apps array as JSON                            ││
│  │  • Persists across sessions                             ││
│  │  • Key: 'pwa-home-apps'                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Model

```javascript
// App Object Structure
{
    id: "unique-id-string",      // Generated unique identifier
    name: "App Name",            // Display name
    url: "https://example.com",  // Full URL to the app
    icon: "📱",                  // Emoji or image URL
    color: "#667eea"             // Hex color for tile accent
}
```

### Key Components

| Component | File | Description |
|-----------|------|-------------|
| **App Grid** | `index.html` | Responsive grid of app tiles |
| **Add Modal** | `index.html` | Form to add new apps |
| **Edit Modal** | `index.html` | Form to edit/delete apps |
| **App Viewer** | `index.html` | Embedded iframe for viewing apps |
| **Service Worker** | `sw.js` | Handles caching and offline |
| **Manifest** | `manifest.json` | PWA configuration |

### Styling Architecture

```css
/* CSS Custom Properties (Theming) */
:root {
    --primary-gradient: linear-gradient(...);
    --primary-color: #667eea;
    --background-color: #f5f7fa;
    --card-background: #ffffff;
    --text-primary: #2d3748;
    --text-secondary: #718096;
}

/* Dark Mode Override */
@media (prefers-color-scheme: dark) {
    :root {
        --background-color: #1a202c;
        --card-background: #2d3748;
        /* ... */
    }
}
```

### Caching Strategy

The Service Worker uses a **versioned, cache-first app shell**:

1. Download all shell assets, bypassing the HTTP cache. A failed download rejects the installation and leaves the previous worker active.
2. Serve the installed release from its own scope-specific cache without background replacement of individual files.
3. Activate an update after the user selects Reload or closes all Dock windows. Delete only older caches with this Dock scope's prefix.
4. Serve the launcher offline, including start URLs with query parameters. Do not intercept unrelated URLs, APIs, or embedded apps.

Increment `CACHE_VERSION` in `sw.js` for every release that changes HTML, CSS,
JavaScript, bundled data, the manifest, or icons. Keep the `appVersion` label and
its accessible name in `index.html` in sync with this version. Deploy these files together.
The legacy shared `dock-v1` cache is no longer read and is left untouched to avoid
deleting data belonging to other apps on the same origin.

Offline support covers Dock's shell and locally saved app list/icons. Linked apps
and remote icon URLs need their own offline support; Dock cannot cache cross-origin
apps on their behalf.

Drag-and-drop uses locally bundled SortableJS 1.15.6 (MIT), including its license
in `js/vendor`. The script is precached with the shell so reordering works offline.

```javascript
// Cache version - increment to force update
const CACHE_VERSION = 'v5';

// Cached assets
const STATIC_ASSETS = [
    './', './index.html', './css/styles.css',
    './js/app.js', './js/vendor/sortable-1.15.6.min.js',
    './data/apps.json', './manifest.json', './icons/icon.svg',
    './icons/icon-128.png', './icons/icon-192.png', './icons/icon-512.png'
];
```

---

## 🎨 Customization

### Change Theme Colors

Edit `css/styles.css`:

```css
:root {
    --primary-gradient: linear-gradient(135deg, #your-color 0%, #your-color-2 100%);
    --primary-color: #your-color;
}
```

### Change Default App

Edit `js/app.js`:

```javascript
const defaultApps = [
    {
        id: '1',
        name: 'Your App',
        url: 'https://your-app-url.com',
        icon: '🚀',
        color: '#4caf50'
    }
];
```

### Add New Icons

Place icons in the `icons/` folder with sizes: 128x128, 192x192, 512x512

---

## 🚀 Deployment

### GitHub Pages (Automatic)

1. Push to the `main` or `master` branch
2. GitHub Actions will automatically deploy
3. Access at: `https://<username>.github.io/<repo>/`

### Manual Deployment

1. Go to **Settings** → **Pages**
2. Source: **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` handles deployment

### Other Platforms

| Platform | Command |
|----------|---------|
| **Netlify** | Drag & drop project folder |
| **Vercel** | `vercel --prod` |
| **Firebase** | `firebase deploy` |

---

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome 60+ | ✅ Full |
| Edge 79+ | ✅ Full |
| Firefox 55+ | ✅ Full |
| Safari 11.1+ | ⚠️ Partial (no install prompt) |
| Opera 47+ | ✅ Full |

### PWA Feature Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Install Prompt | ✅ | ❌ | ❌ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ |
| Embedded Viewer | ✅ | ✅ | ✅ | ✅ |

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

Made with ❤️ for productivity
