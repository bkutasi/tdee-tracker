# TDEE Tracker - Version Management

> Service worker cache versioning with automatic update detection and user notifications.

## Overview

**Purpose**: Prevent users from getting stuck on cached versions by implementing versioned cache names and automatic update detection.

**Features:**
- ✅ Versioned service worker cache name
- ✅ Immediate service worker activation (`skipWaiting` + `clients.claim`)
- ✅ Version badge in footer (GitHub-style)
- ✅ Update available notification with refresh option
- ✅ Automatic update check on page load

---

## Architecture

### Version Flow

```
User visits app
    ↓
VersionManager.init()
    ├─→ Create version badge in footer
    └─→ Register SW update listener
         ↓
    Check for SW updates
         ↓
    New version found?
         ├─→ Yes → Show update notification
         └─→ No → Continue normally
         ↓
    User clicks "Refresh now"
         ↓
    Service worker activates
         ↓
    Page reloads with new version
```

### Version Components

| Component | File | Purpose |
|-----------|------|---------|
| **Service Worker** | `sw.js` | Cache management, versioned cache name |
| **Version Manager** | `js/version.js` | Update detection, UI notifications |
| **Version Badge** | CSS + JS | Displays current version in footer |
| **Update Notification** | CSS + JS | Toast notification for updates |

---

## Version Numbering

**Format**: Semantic versioning (MAJOR.MINOR.PATCH)

**Current Version**: `1.0.0`

**Update Process**:
1. Before each deployment, increment version in **BOTH** files:
   - `sw.js`: `const CACHE_VERSION = '1.0.0';`
   - `js/version.js`: `const APP_VERSION = '1.0.0';`
2. Deploy to Cloudflare Pages
3. Users automatically notified of update on next visit

**Example**:
```javascript
// sw.js
const CACHE_VERSION = '1.1.0'; // Incremented

// js/version.js
const APP_VERSION = '1.1.0'; // Must match sw.js
```

---

## Service Worker Lifecycle

### Install Event
```javascript
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()) // Force immediate activation
    );
});
```

### Activate Event
```javascript
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name)) // Clean old caches
                );
            })
            .then(() => self.clients.claim()) // Take control immediately
    );
});
```

### Message Handler
```javascript
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting(); // Activate immediately on user request
    }
});
```

---

## Version Badge

**Location**: Footer (bottom of page)

**Appearance**:
```
┌─────────────────────┐
│ Version 1.0.0 ●     │
└─────────────────────┘
```

**States**:
- **Normal**: Green indicator (pulsing slowly)
- **Update Available**: Orange indicator (pulsing quickly)

**CSS Classes**:
- `.version-badge` - Container
- `.version-badge__label` - "Version" text
- `.version-badge__version` - Version number
- `.version-badge__indicator` - Status dot

---

## Update Notification

**Trigger**: New service worker installed but waiting to activate

**Appearance**:
```
┌─────────────────────────────────────────────┐
│ 🔄 New version available!  [Refresh] [Later] │
└─────────────────────────────────────────────┘
```

**Behavior**:
- Appears as toast notification (bottom center)
- Auto-hides after 10 seconds
- Dismissible via "Later" button or close icon
- "Refresh now" button activates new SW immediately

**User Actions**:
1. **Refresh now**: Sends `SKIP_WAITING` message to SW, reloads page
2. **Later**: Hides notification, SW waits for next page load
3. **Close (X)**: Same as "Later"

---

## API Reference

### VersionManager

```javascript
// Initialize version manager
await VersionManager.init();

// Get current version
const version = VersionManager.getVersion();

// Manually check for updates
await VersionManager.checkForUpdates();

// Show/hide update indicator on badge
VersionManager.showUpdateIndicator();
VersionManager.hideUpdateIndicator();
```

### Service Worker

```javascript
// Cache name (auto-generated)
const CACHE_NAME = `tdee-tracker-v${CACHE_VERSION}`;

// Example: 'tdee-tracker-v1.0.0'
```

---

## Testing

### Manual Testing

1. **Initial Load**:
   - Open app in browser
   - Verify version badge shows in footer
   - Check browser console for `[Version]` logs

2. **Update Simulation**:
   - Increment version in `sw.js` and `js/version.js`
   - Deploy changes
   - Open app in new tab
   - Verify update notification appears
   - Click "Refresh now" → Page reloads with new version

3. **Offline Mode**:
   - Disconnect network
   - Open app → Should load from cache
   - Reconnect network
   - Refresh → Should detect update

### Browser DevTools

**Service Worker Tab** (Chrome DevTools → Application → Service Workers):
- Check SW status (activated/waiting)
- Click "Update on reload" to force updates
- Click "skipWaiting" to activate immediately

**Console Logs**:
```
[Version] Initializing...
[Version] Ready - v1.0.0
[Version] New service worker installing...
[Version] Update available - showing notification
[Version] User accepted update - reloading
[Version] Service worker activated, reloading...
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Version badge not showing | JS error in version.js | Check console for errors |
| Update notification not appearing | SW not detecting changes | Hard refresh (Ctrl+Shift+R) |
| Old cache persists | Cache name not updated | Increment CACHE_VERSION in sw.js |
| Notification shows but refresh doesn't work | SKIP_WAITING message not handled | Verify sw.js message handler |
| Version mismatch | sw.js and version.js out of sync | Ensure both files have same version |

### Debug Commands

```javascript
// Check service worker status
navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('SW registrations:', regs);
    regs.forEach(reg => {
        console.log('SW scope:', reg.scope);
        console.log('SW active:', reg.active?.scriptURL);
        console.log('SW waiting:', reg.waiting?.scriptURL);
        console.log('SW installing:', reg.installing?.scriptURL);
    });
});

// Check cache names
caches.keys().then(names => console.log('Caches:', names));

// Force update check
registration.update();

// Clear all caches
caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
```

---

## Best Practices

✅ **DO**:
- Increment version in BOTH `sw.js` and `js/version.js` before each deployment
- Test update flow in production-like environment
- Monitor console logs for SW lifecycle events
- Use semantic versioning (MAJOR.MINOR.PATCH)

❌ **DON'T**:
- Forget to update both version constants
- Remove `skipWaiting()` or `clients.claim()` (breaks update flow)
- Ignore SW lifecycle events in console
- Use static cache names (defeats versioning purpose)

---

## Future Enhancements

- [ ] Auto-increment version in CI/CD pipeline
- [ ] Add version to settings modal for easy access
- [ ] Show changelog in update notification
- [ ] Add version to export data JSON metadata
- [ ] Track adoption rate (analytics)

---

## References

- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Google Web Fundamentals: Service Workers](https://web.dev/service-workers/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)

---

**Last Updated**: 2026-03-13  
**Version**: 1.0.0  
**Status**: Production Ready
