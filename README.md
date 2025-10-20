# Project Management System - Frontend

A modern, responsive React-based frontend application for project management with Keycloak authentication, built using Vite, TypeScript, and Tailwind CSS.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [State Management](#state-management)
- [Routing](#routing)
- [UI Components](#ui-components)
- [API Integration](#api-integration)
- [Styling](#styling)
- [Testing](#testing)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Docker](#docker)
- [Performance Optimization](#performance-optimization)
- [Accessibility](#accessibility)
- [Internationalization](#internationalization)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This is a comprehensive project management frontend application providing:

- **User Authentication**: Secure Keycloak OIDC integration with role-based access control
- **Project Management**: Create, manage, and track projects with team collaboration
- **Task Management**: Kanban-style task tracking with drag-and-drop functionality
- **Time Tracking**: Built-in timer with time entry management
- **Real-time Updates**: Optimistic UI updates with automatic data synchronization
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Modern UX**: Intuitive interface with loading states, error handling, and toast notifications

## 🛠 Technology Stack

### Core Framework & Build Tool
- **React** (18.2.0): UI library for building component-based interfaces
- **TypeScript** (5.9.3): Type-safe JavaScript superset
- **Vite** (7.1.9): Next-generation frontend build tool with blazing-fast HMR

### Routing & Navigation
- **React Router DOM** (7.9.3): Client-side routing with nested routes

### State Management & Data Fetching
- **TanStack React Query** (5.8.0): Server state management, caching, and synchronization
- **React Context API**: Local state management for auth and global settings

### UI & Styling
- **Tailwind CSS** (4.1.14): Utility-first CSS framework
- **Tailwind Merge** (3.3.1): Utility for merging Tailwind classes
- **clsx** (2.0.0): Conditional className utility
- **Lucide React** (0.545.0): Beautiful & consistent icon library

### Form Management & Validation
- **React Hook Form** (7.64.0): Performant forms with easy validation
- **Zod** (4.1.12): TypeScript-first schema validation
- **@hookform/resolvers** (5.2.2): Validation resolver for React Hook Form

### Authentication
- **Keycloak JS** (26.2.0): Keycloak JavaScript adapter for OIDC authentication

### HTTP Client
- **Axios** (1.6.0): Promise-based HTTP client with interceptors

### UI Enhancements
- **@dnd-kit** (Core, Sortable, Utilities): Drag-and-drop functionality
- **React Hot Toast** (2.4.1): Beautiful toast notifications
- **Recharts** (3.2.1): Composable charting library for data visualization
- **date-fns** (4.1.0): Modern date utility library

### Internationalization
- **i18next** (25.5.3): Internationalization framework
- **react-i18next** (16.0.0): React integration for i18next
- **i18next-browser-languagedetector** (8.2.0): Language detection plugin

### Testing
- **Vitest** (3.2.4): Blazing-fast unit test framework
- **@testing-library/react** (16.3.0): React testing utilities
- **@testing-library/jest-dom** (6.9.1): Custom DOM matchers
- **@testing-library/user-event** (14.5.1): User interaction simulation
- **@vitest/ui** (3.2.4): UI for Vitest test runner
- **@vitest/coverage-v8** (3.2.4): Code coverage with V8
- **Playwright** (1.56.0): End-to-end testing framework
- **MSW** (2.11.3): Mock Service Worker for API mocking
- **jsdom** (27.0.0): JavaScript implementation of DOM

### Development Tools
- **ESLint** (9.37.0): Code linting and quality
- **@typescript-eslint**: TypeScript-specific linting rules
- **Autoprefixer** (10.4.16): PostCSS plugin for vendor prefixes
- **PostCSS** (8.4.31): CSS transformation tool

## ✨ Features

### Authentication & Security
- Keycloak OIDC single sign-on integration
- Role-based access control (RBAC)
- Protected routes with authentication guards
- Automatic token refresh and session management
- Secure iframe prevention mechanisms
- CSRF and XSS protection

### Project Management
- Create and manage projects with detailed information
- Associate customers/clients with projects
- Project status tracking (Active, On-Hold, Completed)
- Team member assignment and management
- Project timeline with start/end dates
- Project statistics and progress tracking

### Task Management
- Create tasks with assignments and priorities
- Kanban board with drag-and-drop
- Task status workflow (Todo, In Progress, Done)
- Task filtering and search
- Task detail view with comments and history
- Due date tracking

### Time Tracking
- Built-in timer for real-time tracking
- Manual time entry creation and editing
- Time entries linked to projects and tasks
- Time summary and reporting
- Daily, weekly, and monthly views
- Export time data

### Dashboard & Analytics
- Overview of active projects and tasks
- Time tracking summary
- Activity feed
- Visual charts and graphs (using Recharts)
- Quick actions and shortcuts

### User Experience
- Responsive design for all screen sizes
- Loading states and skeletons
- Error boundaries for graceful error handling
- Toast notifications for user feedback
- Optimistic UI updates
- Smooth animations and transitions
- Dark mode support (via Tailwind)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: Node 22)
- **npm** 9+ or **pnpm** 8+
- **Keycloak** instance running (see backend README)
- **Backend API** running (see backend README)

### Installation

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
# or
pnpm install
```

3. **Configure environment** (see [Configuration](#configuration))

4. **Start development server**:
```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

### Quick Start with Development Server

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Open browser to http://localhost:3000
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=project-management
VITE_KEYCLOAK_CLIENT_ID=pm-frontend

# Application Configuration
VITE_APP_NAME=Project Management System
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_REPORTS=true
VITE_ENABLE_ANALYTICS=true

# Security
VITE_EMERGENCY_MODE=false
```

### Environment Files

- `.env` - Default environment variables
- `.env.local` - Local overrides (not committed)
- `.env.development` - Development-specific variables
- `.env.production` - Production-specific variables
- `.env.test` - Test environment variables

### Configuration Files

#### Vite Configuration (`vite.config.ts`)
```typescript
{
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}
```

#### TypeScript Configuration (`tsconfig.json`)
- Strict type checking enabled
- Path aliases for imports (`@/*`)
- ES2020 target with DOM libraries

#### Tailwind Configuration (`tailwind.config.js`)
- Custom color palette
- Extended animations
- Custom utility classes

## 📁 Project Structure

```
frontend/
├── public/                      # Static assets
│   └── vite.svg                # Vite logo
│
├── src/
│   ├── main.tsx                # Application entry point
│   ├── App.tsx                 # Root component with routing
│   ├── index.css               # Global styles and Tailwind imports
│   ├── vite-env.d.ts          # Vite type definitions
│   │
│   ├── components/             # Reusable UI components
│   │   ├── auth/              # Authentication components
│   │   │   ├── AuthCallback.tsx       # OAuth callback handler
│   │   │   └── ProtectedRoute.tsx     # Route guard component
│   │   │
│   │   ├── layout/            # Layout components
│   │   │   ├── Layout.tsx             # Main layout wrapper
│   │   │   ├── Header.tsx             # Application header
│   │   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   │   └── Footer.tsx             # Application footer
│   │   │
│   │   ├── tasks/             # Task-specific components
│   │   │   ├── TaskCard.tsx           # Task card component
│   │   │   ├── TaskList.tsx           # Task list view
│   │   │   ├── KanbanBoard.tsx        # Kanban board
│   │   │   └── TaskForm.tsx           # Task creation/edit form
│   │   │
│   │   ├── timer/             # Time tracking components
│   │   │   ├── TimeTracker.tsx        # Active timer component
│   │   │   └── TimeEntryList.tsx      # Time entry list
│   │   │
│   │   └── ui/                # Generic UI components
│   │       ├── Button.tsx             # Button component
│   │       ├── Input.tsx              # Input component
│   │       ├── Select.tsx             # Select dropdown
│   │       ├── Modal.tsx              # Modal dialog
│   │       ├── Card.tsx               # Card container
│   │       ├── Badge.tsx              # Status badge
│   │       ├── LoadingSpinner.tsx     # Loading indicator
│   │       └── ErrorBoundary.tsx      # Error boundary wrapper
│   │
│   ├── pages/                  # Page components (route targets)
│   │   ├── Dashboard.tsx              # Dashboard overview
│   │   ├── Login.tsx                  # Login page
│   │   ├── Projects.tsx               # Projects list
│   │   ├── ProjectDetail.tsx          # Project detail view
│   │   ├── Tasks.tsx                  # Tasks list/board
│   │   ├── TaskDetail.tsx             # Task detail view
│   │   ├── TimeTracking.tsx           # Time tracking page
│   │   ├── Reports.tsx                # Reports and analytics
│   │   ├── Admin.tsx                  # Admin panel
│   │   └── Unauthorized.tsx           # 403 error page
│   │
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx            # Authentication context
│   │   └── IframeFreeAuthContext.tsx  # Iframe-free auth context
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts                 # Authentication hook
│   │   ├── useProjects.ts             # Project data hook
│   │   ├── useTasks.ts                # Task data hook
│   │   ├── useTimeTracking.ts         # Time tracking hook
│   │   └── useUsers.ts                # User data hook
│   │
│   ├── services/               # API service layer
│   │   ├── api.ts                     # Base API client (Axios)
│   │   ├── keycloak.ts                # Keycloak service
│   │   ├── iframe-free-keycloak.ts    # Iframe-free Keycloak
│   │   ├── projects.ts                # Projects API
│   │   ├── tasks.ts                   # Tasks API
│   │   ├── timeTracking.ts            # Time tracking API
│   │   ├── users.ts                   # Users API
│   │   └── customers.ts               # Customers API
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts                   # Centralized type exports
│   │
│   ├── utils/                  # Utility functions
│   │   ├── dateUtils.ts               # Date formatting and parsing
│   │   ├── cn.ts                      # Tailwind class merging
│   │   ├── iframe-blocker.ts          # Iframe prevention
│   │   ├── emergency-iframe-killer.ts # Emergency iframe killer
│   │   └── nuclear-auth-config.ts     # Auth configuration
│   │
│   ├── config/                 # Application configuration
│   │   └── keycloak.ts                # Keycloak configuration
│   │
│   └── i18n/                   # Internationalization
│       ├── config.ts                  # i18next configuration
│       └── locales/                   # Translation files
│           ├── en.json                # English translations
│           └── es.json                # Spanish translations
│
├── tests/                      # Test files
│   ├── setup.js                       # Test setup and configuration
│   ├── components/                    # Component tests
│   │   ├── TimeTracker.test.jsx
│   │   └── TimeEntryList.test.jsx
│   ├── auth/                          # Authentication tests
│   │   ├── keycloak.test.ts
│   │   └── AuthContext.test.tsx
│   └── mocks/                         # Mock data and handlers
│       ├── handlers.js                # MSW request handlers
│       └── server.js                  # MSW server setup
│
├── docs/                       # Additional documentation
│
├── dist/                       # Build output (generated)
│
├── node_modules/               # Dependencies (generated)
│
├── .env                        # Environment variables
├── .env.example                # Example environment file
├── .gitignore                  # Git ignore rules
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Docker Compose for local dev
├── nginx.conf                  # Nginx configuration for production
├── docker-entrypoint.sh        # Docker entrypoint script
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── package-lock.json           # Dependency lock file
├── tsconfig.json               # TypeScript configuration
├── tsconfig.node.json          # TypeScript config for Node
├── vite.config.ts              # Vite configuration
├── vitest.config.js            # Vitest test configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── README.md                   # This file
```

## 🏗 Architecture

### Component Architecture

The application follows a **component-based architecture** with clear separation of concerns:

1. **Pages**: Route-level components that compose smaller components
2. **Layout Components**: Structural components for consistent layout
3. **Feature Components**: Domain-specific components (tasks, projects, etc.)
4. **UI Components**: Reusable, generic UI elements
5. **Containers**: Components that handle data fetching and business logic

### Data Flow

```
User Action → Event Handler → API Service → React Query
     ↓                                          ↓
  Update UI (Optimistic) ← Cache Update ← API Response
```

### Architectural Patterns

- **Composition**: Components composed from smaller, reusable pieces
- **Container/Presenter**: Separation of logic and presentation
- **Custom Hooks**: Reusable stateful logic extraction
- **Context API**: Global state for auth and settings
- **Service Layer**: Abstracted API communication
- **Type Safety**: TypeScript for compile-time safety

## 🔐 Authentication

### Keycloak Integration

The application uses **Keycloak** for authentication via OIDC (OpenID Connect):

#### Authentication Flow

1. **User visits app** → Redirects to login if unauthenticated
2. **Login page** → Redirects to Keycloak login form
3. **User authenticates** → Keycloak redirects with authorization code
4. **Auth callback** → Exchanges code for tokens
5. **Token storage** → Stores tokens in Keycloak JS adapter
6. **API requests** → Includes Bearer token automatically
7. **Token refresh** → Automatic refresh before expiry

#### Implementation Details

**AuthContext** (`src/contexts/AuthContext.tsx`):
- Initializes Keycloak on app load
- Provides auth state to all components
- Handles login/logout
- Role checking utilities

**Keycloak Service** (`src/services/keycloak.ts`):
- Keycloak initialization
- Token management
- User info retrieval
- Role verification
- Token refresh logic

**API Integration** (`src/services/api.ts`):
- Automatic token injection in requests
- Token refresh on 401 responses
- Request queueing during refresh
- Logout on refresh failure

### Protected Routes

```typescript
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

<Route path="/admin" element={
  <AdminRoute requiredRole="admin">
    <Admin />
  </AdminRoute>
} />
```

### Role-Based Access

```typescript
const { hasRole, hasAnyRole } = useAuth();

// Single role check
if (hasRole('admin')) {
  // Show admin features
}

// Multiple role check
if (hasAnyRole(['admin', 'project-manager'])) {
  // Show management features
}
```

## 📊 State Management

### React Query (TanStack Query)

Used for **server state management**:

```typescript
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.getProjects()
});

// Mutations
const { mutate } = useMutation({
  mutationFn: (data) => projectsApi.createProject(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['projects']);
  }
});
```

**Benefits**:
- Automatic caching and background refetching
- Optimistic updates
- Request deduplication
- Stale-while-revalidate pattern
- Error and loading states

### React Context

Used for **client/global state**:

- **AuthContext**: Authentication state and user info
- **ThemeContext**: UI theme preferences (if implemented)

### Local Component State

- **useState**: Simple local state
- **useReducer**: Complex state logic
- **React Hook Form**: Form state management

## 🗺 Routing

### Route Structure

```typescript
/                          → Redirect to /dashboard
/login                     → Login page
/auth/callback             → OAuth callback handler
/dashboard                 → Dashboard (protected)
/projects                  → Projects list (protected)
/projects/:id              → Project detail (protected)
/tasks                     → Tasks list/board (protected)
/tasks/:id                 → Task detail (protected)
/time-tracking             → Time tracking (protected)
/reports                   → Reports (protected)
/admin                     → Admin panel (protected, admin role)
```

### Navigation

**Declarative Navigation**:
```typescript
import { Link } from 'react-router-dom';

<Link to="/projects">Projects</Link>
```

**Programmatic Navigation**:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/projects');
```

## 🎨 UI Components

### Component Library

Custom UI component library built with **Tailwind CSS**:

#### Button Component
```typescript
<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

Variants: `primary`, `secondary`, `danger`, `ghost`, `link`
Sizes: `sm`, `md`, `lg`

#### Input Component
```typescript
<Input
  label="Email"
  type="email"
  placeholder="Enter email"
  error="Invalid email"
/>
```

#### Select Component
```typescript
<Select
  label="Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ]}
  onChange={handleChange}
/>
```

#### Modal Component
```typescript
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
>
  <p>Are you sure?</p>
</Modal>
```

#### Card Component
```typescript
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

#### Badge Component
```typescript
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Blocked</Badge>
```

### Icons

Using **Lucide React** for consistent iconography:

```typescript
import { Calendar, User, Clock } from 'lucide-react';

<Calendar className="w-5 h-5" />
```

## 🔌 API Integration

### Base API Client

**Axios-based client** with interceptors (`src/services/api.ts`):

```typescript
import { api } from '@/services/api';

// GET request
const data = await api.get<Project[]>('/projects');

// POST request
const project = await api.post<Project>('/projects', projectData);

// PUT request
const updated = await api.put<Project>(`/projects/${id}`, updates);

// DELETE request
await api.delete(`/projects/${id}`);

// Paginated GET
const response = await api.getPaginated<Project>('/projects?page=0&size=10');
```

### Features

- **Automatic token injection**: Bearer token added to all requests
- **Token refresh**: Automatic refresh on 401 responses
- **Request queuing**: Pending requests wait during token refresh
- **Error handling**: Standardized error responses
- **Request/response logging**: Debug logging in development
- **File upload**: Support for multipart/form-data
- **File download**: Automatic download handling

### API Services

Each domain has its own service module:

- `projectsApi`: Project CRUD operations
- `tasksApi`: Task management
- `timeTrackingApi`: Time entries and tracking
- `usersApi`: User management
- `customersApi`: Customer management

### React Query Integration

```typescript
// Custom hook for projects
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects()
  });
};

// Usage in component
const { data: projects, isLoading } = useProjects();
```

## 🎨 Styling

### Tailwind CSS

**Utility-first CSS framework** for rapid UI development:

```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Action
  </button>
</div>
```

### Custom Utilities

**Class merging utility** (`src/utils/cn.ts`):

```typescript
import { cn } from '@/utils/cn';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  'conditional-class'
)} />
```

### Theme Customization

Custom color palette defined in `tailwind.config.js`:

```javascript
colors: {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a',
  },
  gray: {
    50: '#f9fafb',
    900: '#111827',
  }
}
```

### Animations

Custom animations for enhanced UX:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### Responsive Design

Mobile-first responsive breakpoints:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)

## 🧪 Testing

### Test Framework

**Vitest** for unit and integration tests:

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch
```

### Testing Library

**React Testing Library** for component testing:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

test('button handles click', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  const button = screen.getByRole('button');
  fireEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Mock Service Worker (MSW)

API mocking for tests:

```typescript
// tests/mocks/handlers.js
export const handlers = [
  rest.get('/api/v1/projects', (req, res, ctx) => {
    return res(ctx.json({ data: mockProjects }));
  })
];
```

### End-to-End Testing

**Playwright** for E2E tests:

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Test Coverage Goals

- **Unit Tests**: All utility functions and custom hooks
- **Component Tests**: All UI components and pages
- **Integration Tests**: User flows and API integration
- **E2E Tests**: Critical user journeys

## 💻 Development

### Available Scripts

```bash
# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking
npm run typecheck

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Development Workflow

1. **Start services**:
   ```bash
   # In separate terminals
   cd backend && python main.py
   cd frontend && npm run dev
   ```

2. **Make changes**: Edit files with hot reload

3. **Check types**: `npm run typecheck`

4. **Lint code**: `npm run lint`

5. **Run tests**: `npm test`

6. **Build**: `npm run build`

### Code Style

**ESLint configuration** for code quality:
- TypeScript strict mode
- React hooks rules
- Unused variables detection
- Best practices enforcement

### Path Aliases

Use `@` for absolute imports:

```typescript
// Instead of: import Button from '../../../components/ui/Button'
import Button from '@/components/ui/Button';
```

### Hot Module Replacement (HMR)

Vite provides instant HMR for:
- Component changes
- Style updates
- State preservation

## 🏗 Building for Production

### Build Process

```bash
# Build optimized production bundle
npm run build

# Output directory: dist/
```

**Build optimizations**:
- Code splitting and lazy loading
- Minification and compression
- Tree shaking for unused code
- Asset optimization
- Source maps generation

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query']
        }
      }
    }
  }
});
```

### Production Checklist

- [ ] Update environment variables for production
- [ ] Run type checking: `npm run typecheck`
- [ ] Run linting: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Build application: `npm run build`
- [ ] Test production build: `npm run preview`
- [ ] Verify environment variables are not hardcoded
- [ ] Check bundle size
- [ ] Verify all routes work
- [ ] Test authentication flow
- [ ] Check error boundaries
- [ ] Verify API endpoints

## 🐳 Docker

### Dockerfile

Multi-stage Dockerfile for optimized builds:

**Development Stage**:
```bash
docker build --target development -t pm-frontend:dev .
docker run -p 3000:3000 -v $(pwd):/app pm-frontend:dev
```

**Production Stage**:
```bash
docker build --target production -t pm-frontend:prod .
docker run -p 3000:3000 pm-frontend:prod
```

### Docker Compose

```yaml
services:
  frontend:
    build:
      context: ./frontend
      target: production
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:8000/api/v1
      - VITE_KEYCLOAK_URL=http://keycloak:8180
```

### Nginx Configuration

Production uses Nginx for serving static files:

```nginx
server {
  listen 3000;
  root /usr/share/nginx/html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://backend:8000;
  }
}
```

### Health Checks

Docker health check endpoint:
```bash
curl http://localhost:3000
```

Health check runs every 30 seconds with 3 retries.

## ⚡ Performance Optimization

### Code Splitting

**Lazy loading** for routes:

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));

<Route path="/dashboard" element={
  <Suspense fallback={<LoadingSpinner />}>
    <Dashboard />
  </Suspense>
} />
```

### React Query Optimization

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
    }
  }
});
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize component
export const TaskCard = memo(({ task }) => {
  // Component logic
});

// Memoize computed value
const sortedTasks = useMemo(() =>
  tasks.sort((a, b) => a.priority - b.priority),
  [tasks]
);

// Memoize callback
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Bundle Size Optimization

- Tree shaking for unused code
- Dynamic imports for large dependencies
- Code splitting by route
- Lazy loading for images
- Compression (gzip/brotli)

### Performance Monitoring

```typescript
// Track API response times
console.debug(`API call completed in ${duration}ms`);

// React DevTools Profiler
<Profiler id="TaskList" onRender={onRenderCallback}>
  <TaskList />
</Profiler>
```

## ♿ Accessibility

### ARIA Attributes

```typescript
<button
  aria-label="Close modal"
  aria-pressed={isActive}
  role="button"
>
  Close
</button>
```

### Keyboard Navigation

- All interactive elements accessible via keyboard
- Focus management for modals
- Skip navigation links
- Tab order optimization

### Screen Reader Support

- Semantic HTML elements
- ARIA labels and descriptions
- Live regions for dynamic content
- Alt text for images

### Color Contrast

- WCAG AA compliance
- Sufficient contrast ratios
- Color-blind friendly palette

## 🌍 Internationalization

### i18next Configuration

```typescript
// src/i18n/config.ts
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations }
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator']
    }
  });
```

### Using Translations

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button onClick={() => i18n.changeLanguage('es')}>
        Español
      </button>
    </div>
  );
}
```

### Translation Files

```json
// locales/en.json
{
  "welcome": {
    "title": "Welcome to Project Management",
    "subtitle": "Manage your projects efficiently"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

**Problem**: `Error: Port 3000 is already in use`

**Solution**:
```bash
# Find and kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

#### Keycloak Connection Failed

**Problem**: `Authentication service unavailable`

**Solution**:
- Verify Keycloak is running: `http://localhost:8180`
- Check `VITE_KEYCLOAK_URL` in `.env`
- Verify realm name and client ID
- Check network connectivity

#### API Connection Errors

**Problem**: `Network error. Please check your connection.`

**Solution**:
- Verify backend is running: `http://localhost:8000`
- Check `VITE_API_URL` in `.env`
- Verify CORS settings on backend
- Check browser console for errors

#### Build Failures

**Problem**: Build fails with type errors

**Solution**:
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run typecheck
npm run build
```

#### Token Refresh Issues

**Problem**: Constant redirects to login

**Solution**:
- Check token expiry settings in Keycloak
- Verify token refresh logic in `api.ts`
- Clear browser local storage
- Check Keycloak token settings

### Debug Mode

Enable debug logging:

```typescript
// In .env
VITE_DEBUG=true

// In code
if (import.meta.env.VITE_DEBUG) {
  console.debug('Debug info:', data);
}
```

### Browser DevTools

- **React DevTools**: Component hierarchy and props
- **React Query Devtools**: Query cache and state
- **Network Tab**: API requests and responses
- **Console**: Error messages and logs

## 📚 Best Practices

### Component Design
- Keep components small and focused
- Use composition over inheritance
- Extract reusable logic to custom hooks
- Implement proper error boundaries
- Add loading and error states

### TypeScript
- Define interfaces for all data structures
- Use strict type checking
- Avoid `any` type
- Leverage type inference
- Use generics for reusable components

### Performance
- Use React.memo for expensive components
- Implement code splitting
- Optimize images and assets
- Use pagination for large lists
- Debounce expensive operations

### Security
- Never store sensitive data in local storage
- Validate all user inputs
- Sanitize user-generated content
- Use HTTPS in production
- Implement CSRF protection

### Code Organization
- Group related files together
- Use consistent naming conventions
- Keep files under 300 lines
- Write self-documenting code
- Add comments for complex logic

## 🤝 Contributing

### Development Guidelines

1. Create feature branch from `main`
2. Follow existing code style
3. Write tests for new features
4. Update documentation
5. Submit pull request

### Code Review Checklist

- [ ] Tests pass
- [ ] Types are correct
- [ ] Code is linted
- [ ] Documentation updated
- [ ] No console errors
- [ ] Responsive design works
- [ ] Accessibility maintained

## 📄 License

See the root project LICENSE file for details.

## 🔗 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)

## 👥 Support

For issues, questions, or contributions, please refer to the main project repository.

---

**Version**: 1.0.0
**Last Updated**: 2025-10-07
**Built with**: ⚛️ React + ⚡ Vite + 🎨 Tailwind CSS
