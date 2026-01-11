# PWA Home Dashboard

A Progressive Web App (PWA) that serves as a home page/dashboard for launching your web applications.

![PWA Home](https://img.shields.io/badge/PWA-Ready-blue) ![Offline](https://img.shields.io/badge/Offline-Supported-green) ![Installable](https://img.shields.io/badge/Installable-Yes-purple)

## ✨ Features

- **📱 Installable** - Install as a standalone app on any device
- **🔌 Offline Support** - Works without internet connection
- **🔍 Search** - Quickly find apps with instant search
- **➕ Add Custom Apps** - Add any web app to your dashboard
- **✏️ Edit & Delete** - Manage your apps easily
- **🌓 Dark Mode** - Automatic dark mode support
- **📱 Responsive** - Works on all screen sizes
- **⌨️ Keyboard Shortcuts** - Press `Ctrl+K` to focus search

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Edge, Firefox, Safari)
- A local web server (for testing service worker)

### Running Locally

Since PWAs require HTTPS or localhost for service workers, you'll need a local server:

**Option 1: Using VS Code Live Server Extension**
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"

**Option 2: Using Python**
```bash
# Python 3
python -m http.server 8080

# Then open http://localhost:8080
```

**Option 3: Using Node.js**
```bash
# Install serve globally
npm install -g serve

# Run the server
serve .

# Then open http://localhost:3000
```

## 📁 Project Structure

```
home/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest for installability
├── sw.js               # Service Worker for offline support
├── css/
│   └── styles.css      # Stylesheet with dark mode support
├── js/
│   └── app.js          # Main application logic
├── icons/              # App icons (placeholder - add your own)
└── .github/
    └── copilot-instructions.md
```

## 🎨 Customization

### Adding Apps

1. Click the "+ Add New App" button
2. Enter the app name, URL, icon (emoji or image URL), and tile color
3. Click "Add App"

### Default Apps

You can modify the default apps in `js/app.js` by editing the `defaultApps` array:

```javascript
const defaultApps = [
    {
        id: '1',
        name: 'My App',
        url: 'https://example.com',
        icon: '🚀',
        color: '#667eea'
    },
    // Add more apps...
];
```

### Icons

Replace the placeholder icons in the `icons/` folder with your own. Required sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## 📦 PWA Features

### Installation

When visiting the site on a supported browser, you'll see an "Install App" button in the header. Click it to install the PWA to your device.

### Offline Mode

The service worker caches all static assets, allowing the app to work offline. Apps data is stored in localStorage for persistence.

### Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search input
- `Escape` - Close modals

## 🛠️ Development

### Technologies Used

- Vanilla HTML5
- CSS3 (with CSS Variables, Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- Service Worker API
- Web App Manifest

### Browser Support

- Chrome 60+
- Edge 79+
- Firefox 55+
- Safari 11.1+
- Opera 47+

## � Deployment

### GitHub Pages (Automatic)

This project includes a GitHub Actions workflow for automatic deployment:

1. Push your code to the `main` branch
2. Go to your repository **Settings** → **Pages**
3. Under "Build and deployment", select **GitHub Actions**
4. The workflow will automatically deploy on every push to `main`

Your PWA will be available at: `https://<username>.github.io/<repository>/`

### Manual Deployment

You can also deploy to any static hosting service:
- **Netlify**: Drag and drop the project folder
- **Vercel**: Import from GitHub
- **Firebase Hosting**: Use `firebase deploy`

## �📝 License

This project is open source and available under the [MIT License](LICENSE).
