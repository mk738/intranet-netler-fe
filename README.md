# Netler Intranet — Frontend

React + TypeScript frontend for the Netler consultant company intranet. Built with Vite, TanStack Query, and Firebase Authentication.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| HTTP client | Axios |
| Authentication | Firebase (Google OAuth) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| Rich text | TipTap |
| Dates | date-fns |

---

## Prerequisites

- Node.js 18+
- A running backend (Spring Boot) on `http://localhost:8080`
- A Firebase project with Google Sign-In enabled

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

`.env.local`:

```env
# Firebase — from Firebase Console > Project Settings > Your apps
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# API base URL
# Leave empty in development — Vite proxies /api → localhost:8080
# In production set this to your deployed API domain (e.g. https://api.yourdomain.com)
VITE_API_URL=
```

> **Never commit `.env.local` to git.** It is already in `.gitignore`.

### 3. Start the dev server

```bash
npm run dev
```

App runs at **http://localhost:3000**. API calls to `/api/*` are automatically proxied to `http://localhost:8080`.

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project (or use an existing one).
2. Enable **Authentication → Google** as a sign-in provider.
3. Add `http://localhost:3000` to **Authorized domains**.
4. Go to **Project Settings → Your apps** and copy the config values into `.env.local`.

Authentication flow:
- User signs in with Google → Firebase issues a JWT
- JWT is automatically attached as `Authorization: Bearer <token>` on every API request
- Backend validates the JWT against Firebase and maps the email to an employee record

---

## Available Scripts

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Type-check + production build (output to dist/)
npm run preview  # Serve the production build locally
npm run lint     # ESLint check
```

> Always run `npm run build` before pushing or opening a PR to catch TypeScript errors early.

---

## Project Structure

```
src/
├── App.tsx                     # Route definitions
├── main.tsx                    # Entry point — providers setup
├── index.css                   # Global styles + Tailwind utilities
│
├── context/
│   ├── AuthContext.tsx         # Firebase auth state + employee profile
│   └── ReadNewsContext.tsx     # Tracks read news (localStorage)
│
├── lib/
│   ├── firebase.ts             # Firebase init + Google provider
│   ├── api.ts                  # Axios instance with JWT interceptor
│   ├── queryClient.ts          # TanStack Query global config
│   └── dateUtils.ts            # Date helpers
│
├── types/
│   └── index.ts                # All TypeScript types for domain entities
│
├── hooks/                      # Data fetching hooks (one file per domain)
│   ├── useEmployees.ts
│   ├── useEvents.ts
│   ├── useVacations.ts
│   ├── usePlacements.ts
│   ├── useClients.ts
│   ├── useSkills.ts
│   ├── useNews.ts
│   ├── useRsvp.ts
│   └── useFaq.ts
│
├── components/
│   ├── layout/
│   │   ├── ProtectedLayout.tsx # Auth guard + app shell (sidebar, topbar, toast)
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   │
│   ├── ui/                     # Reusable primitives
│   │   ├── index.tsx           # Button, Card, Modal, Spinner, EmptyState, Badge
│   │   ├── Avatar.tsx          # Initials fallback + authenticated image fetch
│   │   ├── Toast.tsx           # Global toast system
│   │   ├── DatePicker.tsx
│   │   ├── FieldError.tsx
│   │   └── PageTransition.tsx
│   │
│   ├── employees/              # Employee management components
│   ├── hub/                    # News & events components
│   ├── vacation/               # Vacation request components
│   ├── placements/             # Assignment components
│   └── crm/                    # Client management components
│
└── pages/
    ├── LoginPage.tsx
    ├── employee/               # Views for all authenticated users
    │   ├── DashboardPage.tsx
    │   ├── NewsPage.tsx + NewsDetailPage.tsx
    │   ├── EventsPage.tsx      # Calendar with multi-day event support
    │   ├── VacationPage.tsx
    │   ├── ProfilePage.tsx + ProfileEditPage.tsx
    │   └── FaqPage.tsx
    └── admin/                  # Views restricted to ADMIN role
        ├── AdminOverviewPage.tsx
        ├── EmployeeListPage.tsx + EmployeeDetailPage.tsx
        ├── VacationReviewPage.tsx
        ├── PlacementsPage.tsx
        ├── CompetencySearchPage.tsx
        ├── CrmListPage.tsx + CrmDetailPage.tsx
        ├── PublishPage.tsx
        ├── NewsCreatePage.tsx
        └── EventCreatePage.tsx
```

---

## Routing & Access Control

Routes are protected by two layout guards:

- **`ProtectedLayout`** — requires any logged-in employee. Renders the sidebar/topbar shell.
- **`AdminLayout`** — additionally requires `role === 'ADMIN'`. Redirects non-admins to `/dashboard`.

```
/login              → public
/dashboard          → all employees
/news, /events      → all employees
/vacation           → all employees
/profile            → all employees
/faq                → all employees
/admin/*            → ADMIN role only
```

---

## Data Fetching Pattern

All server state is managed with **TanStack Query**. Each domain has a dedicated hook file in `src/hooks/`.

```typescript
// Reading data
const { data, isLoading, error } = useEmployees()

// Mutating data
const mutation = useUpdateEmployeeProfile(id)
mutation.mutate(payload, {
  onSuccess: () => showToast('Sparad', 'success'),
  onError:   () => showToast('Något gick fel', 'error'),
})
```

Query keys follow the pattern `['resource', id?, 'sub-resource'?]` so invalidation is predictable:

```typescript
qc.invalidateQueries({ queryKey: ['employees', id] })
```

---

## Toast Notifications

`ToastContainer` lives in `ProtectedLayout` and is mounted once for the entire app — toasts survive page navigation. Use `useToast()` anywhere inside the protected layout:

```typescript
const { showToast } = useToast()
showToast('Sparad!', 'success')
showToast('Något gick fel', 'error')
```

---

## Avatar Images

`Avatar.tsx` fetches images through the authenticated Axios instance (not as plain `<img src>`). This is necessary because the backend requires a Firebase JWT on all endpoints. If you add new image endpoints that require auth, the same pattern applies.

---

## Adding a New Feature

### 1. Add types

Define request/response shapes in `src/types/index.ts`.

### 2. Add hooks

Create or extend a file in `src/hooks/`. Use `useQuery` for reads, `useMutation` for writes.

```typescript
export function useCreateFoo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFooRequest) =>
      api.post<ApiResponse<FooDto>>('/api/foos', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foos'] }),
  })
}
```

### 3. Add a route (if needed)

Add a `<Route>` in `src/App.tsx`. Employee routes go inside `<ProtectedLayout>`, admin routes additionally inside `<AdminLayout>`.

### 4. Add a sidebar link (if needed)

Edit `src/components/layout/Sidebar.tsx` — add to `employeeLinks` or `adminLinks`.

---

## Styling

The design uses a **dark purple theme** defined in `tailwind.config.js`. Avoid hardcoding colors — use the semantic tokens:

| Token | Usage |
|---|---|
| `text-text-1` | Primary text |
| `text-text-2` | Secondary text |
| `text-text-3` | Muted / labels |
| `bg-bg-card` | Card backgrounds |
| `bg-bg-hover` | Hover states |
| `border-subtle` | Dividers |
| `text-success / text-danger / text-warning` | Status colors |
| `text-purple-light` | Accent / highlights |

Common utility classes are defined as `@apply` shortcuts in `index.css`:

```
field-input, field-label, field-input-error
section-label
card
badge-active, badge-ended, badge-prospect, badge-unplaced
btn-primary, btn-secondary, btn-danger
table-row
```

---

## API Contract

The frontend expects the backend to return responses in this shape:

```typescript
{
  success: boolean
  data:    T
  message: string | null
}
```

Errors with a specific error code should include a `code` field:

```typescript
{
  success: false,
  message: "...",
  code:    "VACATION_OVERLAP"   // example
}
```

Use `getApiError(error)` and `getApiCode(error)` from `src/lib/api.ts` to extract these in mutation error handlers.

---

## Key Backend Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/me` | Fetch logged-in employee |
| GET/PUT | `/api/employees/me/profile` | Own profile |
| GET | `/api/employees` | List all employees (admin) |
| GET | `/api/employees/:id` | Employee detail with bank, education, assignments |
| POST | `/api/employees/:id/avatar` | Upload profile picture (multipart) |
| PUT | `/api/employees/:id/terminate` | Set termination date |
| GET/POST | `/api/skills` | Skill catalog |
| GET/POST | `/api/skills/employees/:id` | Employee skills |
| GET/POST | `/api/assignments` | Create assignment |
| PUT | `/api/assignments/:id/end` | End assignment |
| GET | `/api/placements` | Placement overview |
| GET/POST | `/api/clients` | Client list / create |
| GET/PUT | `/api/clients/:id` | Client detail / update |
| GET/POST | `/api/events` | Events |
| DELETE | `/api/events/:id` | Delete event (admin) |
| GET/POST | `/api/vacations` | Vacation requests |
| PUT | `/api/vacations/:id/review` | Approve / reject |
| GET/POST | `/api/news` | News posts |
| GET/POST | `/api/employees/:id/benefits` | Employee benefits |
| GET/POST | `/api/employees/:id/cv` | CV file (multipart) |
| GET/POST | `/api/employees/:id/contract` | Employment contract (multipart) |

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Deploy the contents of `dist/` to any static host (Vercel, Netlify, Firebase Hosting, nginx, etc.).

In production, set `VITE_API_URL` to your backend's domain so the browser hits the real API instead of the Vite proxy:

```env
VITE_API_URL=https://api.yourdomain.com
```
