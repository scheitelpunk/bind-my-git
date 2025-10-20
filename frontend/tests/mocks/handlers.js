import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:8000'

export const handlers = [
  // Authentication endpoints
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.formData()
    const username = body.get('username')
    const password = body.get('password')

    if (username === 'test@example.com' && password === 'testpassword') {
      return HttpResponse.json({
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        expires_in: 3600
      })
    }

    return HttpResponse.json(
      { detail: 'Incorrect username or password' },
      { status: 401 }
    )
  }),

  http.get(`${API_BASE_URL}/users/me`, () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      role: 'employee',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z'
    })
  }),

  // Time entries endpoints
  http.get(`${API_BASE_URL}/time-entries/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        user_id: 1,
        project_id: 1,
        description: 'Test task 1',
        start_time: '2024-01-01T09:00:00Z',
        end_time: '2024-01-01T17:00:00Z',
        duration_minutes: 480,
        hourly_rate: 50.00,
        is_active: false
      },
      {
        id: 2,
        user_id: 1,
        project_id: 2,
        description: 'Test task 2',
        start_time: '2024-01-02T09:00:00Z',
        end_time: null,
        duration_minutes: null,
        hourly_rate: 60.00,
        is_active: true
      }
    ])
  }),

  http.post(`${API_BASE_URL}/time-entries/start`, async ({ request }) => {
    const body = await request.json()

    return HttpResponse.json({
      id: 3,
      user_id: 1,
      project_id: body.project_id,
      description: body.description,
      start_time: new Date().toISOString(),
      end_time: null,
      duration_minutes: null,
      hourly_rate: body.hourly_rate,
      is_active: true
    }, { status: 201 })
  }),

  http.patch(`${API_BASE_URL}/time-entries/:id/stop`, ({ params }) => {
    const id = parseInt(params.id)

    return HttpResponse.json({
      id,
      user_id: 1,
      project_id: 1,
      description: 'Stopped task',
      start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      end_time: new Date().toISOString(),
      duration_minutes: 60,
      hourly_rate: 50.00,
      is_active: false
    })
  }),

  http.get(`${API_BASE_URL}/time-entries/:id`, ({ params }) => {
    const id = parseInt(params.id)

    return HttpResponse.json({
      id,
      user_id: 1,
      project_id: 1,
      description: `Time entry ${id}`,
      start_time: '2024-01-01T09:00:00Z',
      end_time: '2024-01-01T17:00:00Z',
      duration_minutes: 480,
      hourly_rate: 50.00,
      is_active: false
    })
  }),

  http.patch(`${API_BASE_URL}/time-entries/:id`, async ({ request, params }) => {
    const id = parseInt(params.id)
    const body = await request.json()

    return HttpResponse.json({
      id,
      user_id: 1,
      project_id: 1,
      description: body.description || `Time entry ${id}`,
      start_time: '2024-01-01T09:00:00Z',
      end_time: '2024-01-01T17:00:00Z',
      duration_minutes: 480,
      hourly_rate: body.hourly_rate || 50.00,
      is_active: false
    })
  }),

  http.delete(`${API_BASE_URL}/time-entries/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Projects endpoints
  http.get(`${API_BASE_URL}/projects/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Project Alpha',
        description: 'First test project',
        is_active: true
      },
      {
        id: 2,
        name: 'Project Beta',
        description: 'Second test project',
        is_active: true
      }
    ])
  }),

  // Error handlers
  http.get(`${API_BASE_URL}/time-entries/999`, () => {
    return HttpResponse.json(
      { detail: 'Time entry not found' },
      { status: 404 }
    )
  }),

  // Fallback for unhandled requests
  http.all('*', () => {
    console.warn('Unhandled request in MSW')
    return HttpResponse.json(
      { detail: 'Not found' },
      { status: 404 }
    )
  })
]