# Frontend Overview

**Port:** `8000`
**Path:** `frontend/`
**Tech:** React 19 + TypeScript + Vite

---

## Folder Structure

```
frontend/
├── src/
│   ├── main.tsx              ← React app entry point
│   ├── App.tsx               ← Router setup (all routes)
│   ├── App.css               ← Global styles
│   ├── index.css             ← Base CSS reset + variables
│   │
│   ├── pages/
│   │   ├── Login.tsx         ← /login — sign in form
│   │   ├── Signup.tsx        ← /signup — register form
│   │   ├── Dashboard.tsx     ← /dashboard — user home
│   │   └── Chat.tsx          ← /chat — GPT-style chat UI
│   │
│   ├── components/
│   │   ├── MannLogo.tsx      ← Reusable logo component
│   │   └── ProtectedRoute.tsx ← Route guard (requires login)
│   │
│   └── contexts/
│       ├── AuthContext.tsx   ← Login state + API calls
│       └── ThemeContext.tsx  ← Light/Dark/System theme
│
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── image.png
│
├── vite.config.ts            ← Port 8000, React plugin
└── package.json
```

---

## Pages

### `/login` — Login.tsx
- Email + password form
- "Use demo credentials" button (fills test@mann.dev / test123)
- Calls `AuthContext.login()` → `POST /api/auth/login`
- Success → navigate to `/dashboard`

### `/signup` — Signup.tsx
- Name + email + password form
- Calls `AuthContext.signup()` → `POST /api/auth/signup`
- Success → navigate to `/dashboard`

### `/dashboard` — Dashboard.tsx
- Protected route (login required)
- User ka home screen

### `/chat` — Chat.tsx
- GPT-style 3-panel layout:
  - Left sidebar: Navigation (Chat, Agents, Memory, Tools)
  - Center: Message list + input
  - Right sidebar: Chat history
- Auto-hide sidebars on cursor proximity
- Manual lock/unlock sidebars
- Typing indicator animation
- Dark/Light/System theme switcher

---

## Key Context Files

### AuthContext.tsx
```typescript
const API_BASE = 'http://localhost:5000/api'

// login() — POST /api/auth/login
// signup() — POST /api/auth/signup
// logout() — clears localStorage

// State persisted in:
// localStorage.getItem('token')
// localStorage.getItem('currentUser')
```

### ThemeContext.tsx
- 3 modes: `light`, `dark`, `system`
- System mode follows OS preference via `prefers-color-scheme`
- Persisted in localStorage

---

## Protected Routes

```typescript
// ProtectedRoute.tsx
// Agar token nahi hai localStorage mein → /login pe redirect
// Agar token hai → children render karo
```

---

## Dependencies

```json
{
  "react": "^19.3.1",
  "react-dom": "^19.3.1",
  "react-router-dom": "^7.18.5"
}
```

**Dev dependencies:**
```json
{
  "vite": "^8.3.6",
  "typescript": "~6.0.3",
  "@vitejs/plugin-react": "^6.1.2",
  "eslint": "^10.14.0"
}
```

---

## Build

```bash
# Dev server
npm run dev     # http://localhost:8000

# Production build
npm run build   # outputs to frontend/dist/

# Preview production build
npm run preview
```
