# React Frontend Architecture

## Application Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Layout/
│   │   │   │   ├── AppBar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── Forms/
│   │   │   │   ├── FormField.tsx
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   └── TimeInput.tsx
│   │   │   ├── Tables/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── TablePagination.tsx
│   │   │   │   └── TableFilters.tsx
│   │   │   └── UI/
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── AuthCallback.tsx
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   └── ProjectMembersList.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── TaskBoard.tsx
│   │   ├── timeTracking/
│   │   │   ├── TimeEntryForm.tsx
│   │   │   ├── TimeEntryList.tsx
│   │   │   ├── ActiveTimer.tsx
│   │   │   ├── TimeEntryCard.tsx
│   │   │   └── TimesheetView.tsx
│   │   └── reports/
│   │       ├── ReportDashboard.tsx
│   │       ├── TimesheetReport.tsx
│   │       ├── ProjectReport.tsx
│   │       └── UserProductivityReport.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useProjects.ts
│   │   ├── useTasks.ts
│   │   ├── useTimeTracking.ts
│   │   └── useLocalStorage.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   ├── tasks.ts
│   │   │   ├── timeEntries.ts
│   │   │   └── reports.ts
│   │   ├── auth/
│   │   │   ├── keycloak.ts
│   │   │   ├── tokenManager.ts
│   │   │   └── authContext.tsx
│   │   └── storage/
│   │       ├── localStorage.ts
│   │       └── sessionStorage.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── authSlice.ts
│   │   ├── projectsSlice.ts
│   │   ├── tasksSlice.ts
│   │   ├── timeTrackingSlice.ts
│   │   └── uiSlice.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── project.ts
│   │   ├── task.ts
│   │   ├── timeEntry.ts
│   │   └── user.ts
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Projects.tsx
│   │   ├── Tasks.tsx
│   │   ├── TimeTracking.tsx
│   │   ├── Reports.tsx
│   │   ├── Profile.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx
│   ├── index.tsx
│   └── setupTests.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── Dockerfile
```

## Authentication Integration

### 1. Keycloak Configuration (services/auth/keycloak.ts)
```typescript
import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL!,
  realm: process.env.REACT_APP_KEYCLOAK_REALM!,
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID!,
};

const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = async (): Promise<boolean> => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });

    // Set up token refresh
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        console.error('Failed to refresh token');
        keycloak.logout();
      });
    };

    return authenticated;
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
    return false;
  }
};

export { keycloak };
```

### 2. Auth Context Provider (services/auth/authContext.tsx)
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { keycloak, initKeycloak } from './keycloak';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  token: string | undefined;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authenticated = await initKeycloak();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const userProfile = await keycloak.loadUserProfile();
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = () => {
    keycloak.login({
      redirectUri: window.location.origin + '/dashboard'
    });
  };

  const logout = () => {
    keycloak.logout({
      redirectUri: window.location.origin
    });
  };

  const hasRole = (role: string): boolean => {
    return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role);
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    hasRole,
    token: keycloak.token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 3. Protected Route Component (components/auth/ProtectedRoute.tsx)
```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import LoadingSpinner from '../common/UI/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = []
}) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

## State Management with Redux Toolkit

### 1. Store Configuration (store/index.ts)
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../services/api/auth';
import { projectsApi } from '../services/api/projects';
import { tasksApi } from '../services/api/tasks';
import { timeEntriesApi } from '../services/api/timeEntries';
import authSlice from './authSlice';
import uiSlice from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    [authApi.reducerPath]: authApi.reducer,
    [projectsApi.reducerPath]: projectsApi.reducer,
    [tasksApi.reducerPath]: tasksApi.reducer,
    [timeEntriesApi.reducerPath]: timeEntriesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(projectsApi.middleware)
      .concat(tasksApi.middleware)
      .concat(timeEntriesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Time Tracking Slice (store/timeTrackingSlice.ts)
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TimeEntry } from '../types/timeEntry';

interface TimeTrackingState {
  activeEntry: TimeEntry | null;
  recentEntries: TimeEntry[];
  isTracking: boolean;
  dailyTotal: number;
}

const initialState: TimeTrackingState = {
  activeEntry: null,
  recentEntries: [],
  isTracking: false,
  dailyTotal: 0,
};

const timeTrackingSlice = createSlice({
  name: 'timeTracking',
  initialState,
  reducers: {
    startTracking: (state, action: PayloadAction<TimeEntry>) => {
      state.activeEntry = action.payload;
      state.isTracking = true;
    },
    stopTracking: (state) => {
      if (state.activeEntry) {
        state.recentEntries.unshift(state.activeEntry);
        state.activeEntry = null;
        state.isTracking = false;
      }
    },
    updateActiveEntry: (state, action: PayloadAction<Partial<TimeEntry>>) => {
      if (state.activeEntry) {
        state.activeEntry = { ...state.activeEntry, ...action.payload };
      }
    },
    setDailyTotal: (state, action: PayloadAction<number>) => {
      state.dailyTotal = action.payload;
    },
  },
});

export const { startTracking, stopTracking, updateActiveEntry, setDailyTotal } =
  timeTrackingSlice.actions;
export default timeTrackingSlice.reducer;
```

## API Integration with RTK Query

### 1. Time Entries API (services/api/timeEntries.ts)
```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TimeEntry, TimeEntryCreate, TimeEntryUpdate } from '../../types/timeEntry';
import { keycloak } from '../auth/keycloak';

export const timeEntriesApi = createApi({
  reducerPath: 'timeEntriesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.REACT_APP_API_URL}/api/v1/time-entries`,
    prepareHeaders: (headers) => {
      if (keycloak.token) {
        headers.set('Authorization', `Bearer ${keycloak.token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['TimeEntry'],
  endpoints: (builder) => ({
    getTimeEntries: builder.query<TimeEntry[], {
      startDate?: string;
      endDate?: string;
      projectId?: string;
      taskId?: string;
    }>({
      query: (params) => ({
        url: '',
        params,
      }),
      providesTags: ['TimeEntry'],
    }),
    createTimeEntry: builder.mutation<TimeEntry, TimeEntryCreate>({
      query: (timeEntry) => ({
        url: '',
        method: 'POST',
        body: timeEntry,
      }),
      invalidatesTags: ['TimeEntry'],
    }),
    updateTimeEntry: builder.mutation<TimeEntry, { id: string; data: TimeEntryUpdate }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TimeEntry'],
    }),
    deleteTimeEntry: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TimeEntry'],
    }),
    getCurrentTimeEntry: builder.query<TimeEntry | null, void>({
      query: () => '/current',
      providesTags: ['TimeEntry'],
    }),
    stopTimeEntry: builder.mutation<TimeEntry, string>({
      query: (id) => ({
        url: `/${id}/stop`,
        method: 'POST',
      }),
      invalidatesTags: ['TimeEntry'],
    }),
  }),
});

export const {
  useGetTimeEntriesQuery,
  useCreateTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation,
  useGetCurrentTimeEntryQuery,
  useStopTimeEntryMutation,
} = timeEntriesApi;
```

## Time Tracking Components

### 1. Active Timer Component (components/timeTracking/ActiveTimer.tsx)
```typescript
import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Box } from '@mui/material';
import { PlayArrow, Stop, Pause } from '@mui/icons-material';
import { useStopTimeEntryMutation, useGetCurrentTimeEntryQuery } from '../../services/api/timeEntries';
import { formatDuration } from '../../utils/dateUtils';

const ActiveTimer: React.FC = () => {
  const [elapsed, setElapsed] = useState(0);
  const { data: currentEntry, refetch } = useGetCurrentTimeEntryQuery();
  const [stopTimeEntry] = useStopTimeEntryMutation();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentEntry) {
      interval = setInterval(() => {
        const start = new Date(currentEntry.start_time);
        const now = new Date();
        setElapsed(Math.floor((now.getTime() - start.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentEntry]);

  const handleStop = async () => {
    if (currentEntry) {
      try {
        await stopTimeEntry(currentEntry.id).unwrap();
        refetch();
      } catch (error) {
        console.error('Failed to stop time entry:', error);
      }
    }
  };

  if (!currentEntry) {
    return null;
  }

  return (
    <Card sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" color="success.dark">
            {currentEntry.task?.title || 'No task selected'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentEntry.project?.name}
          </Typography>
        </Box>
        <Box textAlign="center">
          <Typography variant="h4" color="success.dark">
            {formatDuration(elapsed)}
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={handleStop}
            sx={{ mt: 1 }}
          >
            Stop
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

export default ActiveTimer;
```

### 2. Time Entry Form with Validation (components/timeTracking/TimeEntryForm.tsx)
```typescript
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  TextField,
  Autocomplete,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { TimeEntryCreate } from '../../types/timeEntry';
import { useCreateTimeEntryMutation } from '../../services/api/timeEntries';
import { useGetProjectsQuery } from '../../services/api/projects';
import { useGetTasksQuery } from '../../services/api/tasks';

const schema = yup.object({
  project_id: yup.string().required('Project is required'),
  task_id: yup.string().required('Task is required'),
  description: yup.string(),
  start_time: yup.date().required('Start time is required'),
  end_time: yup
    .date()
    .required('End time is required')
    .test('after-start', 'End time must be after start time', function(value) {
      return !this.parent.start_time || !value || value > this.parent.start_time;
    }),
  is_billable: yup.boolean(),
  hourly_rate: yup.number().positive('Hourly rate must be positive').nullable(),
});

interface TimeEntryFormProps {
  onSuccess?: () => void;
  initialValues?: Partial<TimeEntryCreate>;
}

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({ onSuccess, initialValues }) => {
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: tasks = [] } = useGetTasksQuery();
  const [createTimeEntry, { isLoading }] = useCreateTimeEntryMutation();

  const { control, handleSubmit, watch, formState: { errors } } = useForm<TimeEntryCreate>({
    resolver: yupResolver(schema),
    defaultValues: {
      start_time: new Date(),
      end_time: new Date(),
      is_billable: true,
      ...initialValues,
    },
  });

  const selectedProjectId = watch('project_id');
  const projectTasks = tasks.filter(task => task.project_id === selectedProjectId);

  const onSubmit = async (data: TimeEntryCreate) => {
    try {
      await createTimeEntry(data).unwrap();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create time entry:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Controller
            name="project_id"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={projects}
                getOptionLabel={(option) => option.name}
                onChange={(_, value) => field.onChange(value?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Project"
                    error={!!errors.project_id}
                    helperText={errors.project_id?.message}
                    fullWidth
                  />
                )}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="task_id"
            control={control}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={projectTasks}
                getOptionLabel={(option) => option.title}
                onChange={(_, value) => field.onChange(value?.id || '')}
                disabled={!selectedProjectId}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Task"
                    error={!!errors.task_id}
                    helperText={errors.task_id?.message}
                    fullWidth
                  />
                )}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="start_time"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                {...field}
                label="Start Time"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!errors.start_time}
                    helperText={errors.start_time?.message}
                    fullWidth
                  />
                )}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="end_time"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                {...field}
                label="End Time"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!errors.end_time}
                    helperText={errors.end_time?.message}
                    fullWidth
                  />
                )}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description"
                multiline
                rows={3}
                fullWidth
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="is_billable"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Billable"
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="hourly_rate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Hourly Rate"
                type="number"
                InputProps={{ startAdornment: '$' }}
                error={!!errors.hourly_rate}
                helperText={errors.hourly_rate?.message}
                fullWidth
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? 'Creating...' : 'Create Time Entry'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TimeEntryForm;
```

## Performance Optimizations

### 1. Code Splitting
```typescript
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/common/UI/LoadingSpinner';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const Reports = lazy(() => import('./pages/Reports'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/projects" element={<Projects />} />
    <Route path="/time-tracking" element={<TimeTracking />} />
    <Route path="/reports" element={<Reports />} />
  </Routes>
</Suspense>
```

### 2. Memoization
```typescript
import React, { memo, useMemo } from 'react';

interface TimeEntryListProps {
  entries: TimeEntry[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const TimeEntryList = memo<TimeEntryListProps>(({ entries, onEdit, onDelete }) => {
  const totalHours = useMemo(() => {
    return entries.reduce((total, entry) => total + entry.duration_minutes / 60, 0);
  }, [entries]);

  return (
    <div>
      <Typography variant="h6">
        Total: {totalHours.toFixed(2)} hours
      </Typography>
      {entries.map(entry => (
        <TimeEntryCard
          key={entry.id}
          entry={entry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});
```

### 3. Virtual Scrolling for Large Lists
```typescript
import { FixedSizeList as List } from 'react-window';

const VirtualizedTimeEntryList: React.FC<{ entries: TimeEntry[] }> = ({ entries }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TimeEntryCard entry={entries[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={entries.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
};
```