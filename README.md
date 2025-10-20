# Project Management System

A modern, full-stack project management application built with FastAPI, React, and PostgreSQL. Features comprehensive project tracking, time management, task organization, and reporting capabilities with Keycloak authentication.

## 🚀 Features

### Core Functionality
- **Project Management**: Complete CRUD operations for projects with status tracking
- **Task Management**: Create, assign, and track tasks with priorities, tags, and due dates
- **Time Tracking**: Built-in timer and manual time entry management
- **Comments System**: Real-time commenting on tasks with edit/delete capabilities
- **Reports & Analytics**:
  - Interactive charts (bar, pie, line) with Recharts
  - Time breakdown by project
  - Task status distribution
  - Daily hours trends
  - Exportable CSV reports
- **User Management**: Role-based access control with Keycloak integration
- **Customer Management**: Link projects to customers and orders
- **Item Management**: Associate tasks with specific items/materials

### User Experience
- **Internationalization**: Full support for English and German (i18n)
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Real-time Updates**: Automatic cache invalidation and refetching
- **Drag & Drop**: Kanban board for task management
- **Dark Mode Ready**: Modern UI with Lucide icons

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **SQLAlchemy**: ORM with Alembic migrations
- **PostgreSQL**: Primary database
- **Keycloak**: Authentication and authorization
- **Pydantic**: Data validation and serialization

### Frontend
- **React 18**: Modern UI library with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **TanStack Query (React Query)**: Server state management
- **React Router v7**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Data visualization
- **React Hook Form + Zod**: Form validation
- **i18next**: Internationalization

### Development Tools
- **Docker & Docker Compose**: Containerization
- **Vitest**: Unit testing
- **Playwright**: E2E testing
- **ESLint**: Code linting
- **TypeScript**: Type checking

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project_management
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Keycloak: http://localhost:8080
   - PostgreSQL: localhost:5432

### Local Development Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
project_management/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core configurations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── tests/              # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── i18n/           # Translations
│   │   └── utils/          # Utilities
│   └── tests/              # Frontend tests
├── docs/                   # Documentation
└── docker-compose.yml      # Docker configuration
```

## 🔑 Authentication

The application uses Keycloak for authentication. Default setup:
- **Realm**: `project-management`
- **Client ID**: `project-management-frontend`
- **Admin Console**: http://localhost:8080/admin

### User Roles
- `admin`: Full system access
- `project_manager`: Create/manage projects and tasks
- `user`: View and update assigned tasks

## 🗄️ Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
pytest --cov=app tests/  # With coverage
```

### Frontend Tests
```bash
cd frontend
npm run test              # Unit tests
npm run test:coverage     # With coverage
npm run test:e2e          # E2E tests
npm run test:e2e:ui       # E2E tests with UI
```

## 🏗️ Development Workflow

### Frontend Development
```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run typecheck   # TypeScript checking
npm run lint        # Lint code
```

### API Development
- Interactive API docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## 📊 Recent Updates

### Latest Features
- ✅ Reports page with interactive charts (bar, pie, line)
- ✅ Full internationalization (English/German)
- ✅ Real-time comment updates with automatic cache refresh
- ✅ CSV export for time entries and projects
- ✅ Improved TypeScript types across the application
- ✅ Enhanced UI/UX with better button sizes and layouts

### Bug Fixes
- ✅ Fixed comment deletion requiring manual page refresh
- ✅ Resolved TypeScript errors in TaskDetail component
- ✅ Fixed button size props in time entry management
- ✅ Improved useUsers hook with proper type annotations

## 📈 Milestones

### ✅ Milestone 1: Core Functionality
- Project CRUD operations
- Task management
- Keycloak authentication

### ✅ Milestone 2: Enhanced Features
- Time entry tracking
- Comments system
- User permissions and roles

### ✅ Milestone 3: Advanced Features
- Frontend application
- Reports and analytics
- Internationalization

### 🔄 Milestone 4: Integration (In Progress)
- Notifications system
- Versino Brain integration
- Advanced reporting

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and type checking
4. Submit a pull request

## 📝 License

[Your License Here]

## 🐛 Known Issues

- None currently tracked

## 📞 Support

For issues or questions, please open an issue on the repository.

---

**Built with ❤️ using FastAPI, React, and PostgreSQL**
