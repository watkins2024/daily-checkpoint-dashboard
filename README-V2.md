# Daily Checkpoint Dashboard v2.0

> A modern, intelligent command center for tracking walks, work, finances, and leverage with advanced analytics and insights.

## 🌟 What's New in v2.0

### Major Enhancements

**🎨 Modern Design System**
- Sleek, glassmorphic UI with smooth animations
- Advanced CSS variables for consistent theming
- Responsive grid system with mobile-first approach
- Beautiful gradient accents and hover effects

**📊 Smart Analytics Engine**
- Pattern detection and trend analysis
- Predictive insights based on historical data
- Automated anomaly detection for finances
- Personalized suggestions and reminders
- Real-time data visualization with Chart.js

**⚡ Advanced Features**
- **Keyboard Shortcuts**: Navigate faster with hotkeys (press `?` to see all)
- **Toast Notifications**: Beautiful, non-intrusive feedback
- **Data Export**: One-click JSON export of all your data
- **Search**: Quick search across all dashboard content (Ctrl+/)
- **PWA Support**: Install as a native app, works offline
- **Modular Architecture**: Clean ES6 modules for maintainability

**🤖 Anticipatory Intelligence**
- Streak predictions and milestone alerts
- Habit pattern recognition
- Financial runway warnings
- Productivity insights based on time-of-day patterns
- Smart "What's Next?" recommendations

## 🚀 Quick Start

### Running Locally

```bash
# Serve the dashboard
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/index-v2.html
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Run this SQL in the SQL Editor:

```sql
create table if not exists dash_state (
  user_id uuid primary key references auth.users on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table dash_state enable row level security;

create policy "Users manage their own dashboard"
  on dash_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Copy configuration template:

```bash
cp scripts/app-config.example.js scripts/app-config.js
```

4. Add your Supabase credentials to `scripts/app-config.js`:

```javascript
window.APP_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY'
};
```

## 📱 Features

### Core Capabilities

**🚶 Walks**
- Log dawn walks with location, weather, mood
- Track moon phases automatically
- Streak tracking with predictions
- Star sip & salt checkboxes for rituals
- Rich notes for reflections

**💼 Work & Study**
- Schedule planning
- Class notes and focus sessions
- Progress tracking
- Productivity analytics by time of day

**🏠 Household**
- Financial runway calculator
- Net worth tracking
- Savings rate analysis
- Anomaly detection for unusual transactions
- Trend visualization

**⚡ Leverage**
- Micro-step planning
- Sprint management
- Progress visualization
- Completion tracking

**📊 Business**
- Daily stand-ups
- Operations pipeline
- Business metrics

### Analytics Dashboard

The new analytics dashboard provides:

- **Walk Insights**
  - Current and longest streaks
  - Average walks per week
  - Most common times, moods, locations
  - Moon phase correlations
  - Weekly activity charts
  - Mood distribution visualizations

- **Financial Insights**
  - Current balance and trend analysis
  - Monthly burn rate calculation
  - Runway projections
  - Savings rate tracking
  - Anomaly detection with visualizations
  - Balance history charts

- **Productivity Insights**
  - Task completion rates
  - Active day streaks
  - Most productive hours
  - Pattern-based suggestions

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show all keyboard shortcuts |
| `Ctrl+/` | Toggle search |
| `w` | Open Walks |
| `h` | Open Household |
| `b` | Open Business |
| `l` | Open Leverage |
| `e` | Export data |
| `Esc` | Close modals/blur inputs |

## 🏗️ Architecture

### Modular Structure

```
daily-checkpoint-dashboard/
├── src/
│   ├── core/
│   │   ├── Component.js      # Base component class
│   │   ├── Router.js         # Client-side routing
│   │   └── EventBus.js       # Global event system
│   ├── components/
│   │   ├── Toast.js          # Notification system
│   │   ├── KeyboardShortcuts.js
│   │   └── AnalyticsDashboard.js
│   ├── lib/
│   │   └── Analytics.js      # Insights engine
│   └── styles/
│       └── design-system.css # Design tokens & utilities
├── scripts/
│   ├── store-sync.js         # Supabase sync
│   ├── auth-ui.js            # Authentication UI
│   └── whatsnext.js          # Smart suggestions
├── sw.js                     # Service worker (PWA)
├── manifest.json             # PWA manifest
└── index-v2.html             # Modern entry point
```

### Design Principles

1. **Offline-First**: Service worker caches assets for offline use
2. **Progressive Enhancement**: Works without JavaScript, enhanced with it
3. **Component-Based**: Reusable UI components with lifecycle hooks
4. **Event-Driven**: Decoupled communication via EventBus
5. **Reactive**: Auto-updates when data changes
6. **Accessible**: Semantic HTML, ARIA labels, keyboard navigation

## 🎨 Design System

### Color Palette

```css
--accent-primary: #7be3ff;    /* Cyan */
--accent-secondary: #6cf3b1;  /* Green */
--accent-warning: #ffb84a;    /* Orange */
--accent-error: #ff6b8a;      /* Red */
```

### Typography

- **Headings**: Rajdhani (modern, geometric)
- **Body**: Noto Sans JP (clean, readable)

### Components

- Cards with glassmorphism effects
- Gradient buttons with ripple animations
- Form inputs with focus states
- Badges, progress bars, modals
- Loading skeletons and spinners

## 🔧 API Reference

### Store API

```javascript
// Get data
const walks = store.get('fh.walks', []);

// Set data (auto-syncs to Supabase)
store.set('fh.walks', newWalks);

// Remove data
store.remove('fh.walks');

// Subscribe to changes
store.subscribe((keys) => {
  console.log('Changed:', keys);
});

// Force sync
await store.flush();
```

### Analytics API

```javascript
import { Analytics } from './src/lib/Analytics.js';

const analytics = new Analytics(window.store);

// Get walk insights
const walkInsights = analytics.analyzeWalkPatterns();

// Get financial insights
const financialInsights = analytics.analyzeFinancials();

// Get productivity insights
const productivityInsights = analytics.analyzeProductivity();

// Get comprehensive dashboard insights
const allInsights = analytics.generateDashboardInsights();
```

### Toast Notifications

```javascript
import { toast } from './src/components/Toast.js';

// Show toast
toast.success('Walk logged!');
toast.error('Failed to save');
toast.warning('Streak ending soon');
toast.info('New feature available');

// With action button
toast.show('Undo available', {
  type: 'info',
  duration: 5000,
  action: {
    label: 'Undo',
    onClick: () => undoLastAction(),
  },
});
```

### Keyboard Shortcuts

```javascript
import { shortcuts } from './src/components/KeyboardShortcuts.js';

// Register shortcut
shortcuts.register('ctrl+n', 'Create new item', () => {
  openNewItemModal();
});

// Unregister
shortcuts.unregister('ctrl+n');

// Show help dialog
shortcuts.showHelp();
```

## 📊 Data Schema

### Walks

```json
{
  "date": "2026-01-18T06:30:00.000Z",
  "location": "coast / north west",
  "weather": "Cold",
  "mood": "Calm",
  "star": true,
  "salt": false,
  "notes": "Fox crossed path, magpies before light",
  "moonPhase": "Waning Crescent"
}
```

### Household

```json
{
  "when": "2026-01-18",
  "total": 45000,
  "note": "Monthly update"
}
```

### Work Schedule

```json
{
  "when": "Monday 9am",
  "what": "Team standup",
  "notes": "Discuss sprint goals"
}
```

## 🚀 Deployment

### Static Hosting (GitHub Pages, Netlify, Vercel)

1. Include `scripts/app-config.js` with your Supabase credentials
2. Deploy the entire directory
3. Set `index-v2.html` as the entry point

### PWA Installation

Users can install the dashboard as a native app:

1. Visit the site in Chrome/Edge/Safari
2. Click "Install" in the address bar
3. Works offline with full functionality

## 🔒 Security

- **Row Level Security**: Supabase RLS ensures users only see their data
- **Client-Side Only**: No server-side code = no server vulnerabilities
- **Encrypted Transit**: HTTPS + Supabase Auth
- **No Secrets in Repo**: `app-config.js` is gitignored
- **MFA Ready**: Enable in Supabase Auth settings

## 🤝 Contributing

This is a personal dashboard, but feel free to fork and customize!

### Customization Ideas

- Add new tracking categories
- Integrate with other APIs (weather, calendar, etc.)
- Custom analytics rules
- Theme customization
- Additional visualizations

## 📈 Performance

- **First Load**: ~200KB (including CDN libraries)
- **Subsequent Loads**: <50KB (cached assets)
- **Offline**: Full functionality via service worker
- **Sync**: ~1.5s debounced Supabase saves

## 🐛 Troubleshooting

**Dashboard not loading?**
- Check `scripts/app-config.js` exists and has valid Supabase credentials
- Open browser console for errors

**Data not syncing?**
- Verify Supabase table and RLS policy are created
- Check network tab for API errors
- Try `store.flush()` in console

**Authentication loop?**
- Clear browser cache and localStorage
- Check Supabase Auth settings
- Verify email confirmation settings

## 📝 License

Personal project - use freely!

## 🙏 Acknowledgments

- **Supabase**: Amazing backend-as-a-service
- **Chart.js**: Beautiful visualizations
- **Google Fonts**: Rajdhani & Noto Sans JP

---

**Built with ⚡ by someone who loves dawn walks and data**
