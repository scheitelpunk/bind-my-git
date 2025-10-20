# Keycloak Authentication Flow - Manual Testing Guide

## 🚀 Prerequisites Verification

✅ All services are running and accessible:
- **Frontend**: http://localhost:3000 (React App with Vite)
- **Keycloak**: http://localhost:8180 (Admin Console accessible)
- **API Backend**: http://localhost:8000 (Health check passed)

## 🔐 Keycloak Setup Tasks

### 1. Access Keycloak Admin Console

1. Open browser: http://localhost:8180/admin
2. Login with credentials:
   - Username: `admin`
   - Password: `admin`

### 2. Create ProjectFlow Realm (if not exists)

1. In admin console, click on realm dropdown (currently "Master")
2. Click "Create Realm"
3. Set realm name: `projectflow`
4. Click "Create"

### 3. Configure Client for Frontend

1. Navigate to "Clients" in left sidebar
2. Click "Create client"
3. Set configuration:
   - **Client type**: OpenID Connect
   - **Client ID**: `projectflow-frontend`
   - **Name**: `ProjectFlow Frontend`
4. Click "Next"
5. Set capability config:
   - **Client authentication**: OFF (public client)
   - **Authorization**: OFF
   - **Standard flow**: ON
   - **Direct access grants**: ON
6. Click "Next"
7. Set login settings:
   - **Root URL**: `http://localhost:3000`
   - **Home URL**: `http://localhost:3000`
   - **Valid redirect URIs**: `http://localhost:3000/*`
   - **Valid post logout redirect URIs**: `http://localhost:3000/*`
   - **Web origins**: `http://localhost:3000`
8. Click "Save"

### 4. Configure CORS Settings

1. In the client settings, scroll to "Access settings"
2. Ensure "Web origins" includes: `http://localhost:3000`
3. Save changes

### 5. Create Test User

1. Navigate to "Users" in left sidebar
2. Click "Create new user"
3. Set user details:
   - **Username**: `testuser`
   - **First name**: `Test`
   - **Last name**: `User`
   - **Email**: `test@projectflow.com`
   - **Email verified**: ON
4. Click "Create"
5. Go to "Credentials" tab
6. Click "Set password"
7. Set password: `testpassword`
8. Turn OFF "Temporary"
9. Click "Save"

## 🧪 Frontend Authentication Testing

### Step 1: Initial Frontend Load

1. Open browser to http://localhost:3000
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Go to **Network** tab
5. Refresh the page

**Expected Results:**
- ✅ React app loads without errors
- ✅ No CSP violations in console
- ✅ No CORS errors in network tab
- ✅ All static assets load successfully

### Step 2: Authentication Flow Testing

1. Look for login/authentication buttons on the page
2. Click the login button

**Expected Results:**
- ✅ Redirect to Keycloak login page: `http://localhost:8180/realms/projectflow/protocol/openid-connect/auth?...`
- ✅ No CSP violations during redirect
- ✅ No CORS errors in network tab

### Step 3: Keycloak Login

1. On Keycloak login page, enter credentials:
   - Username: `testuser`
   - Password: `testpassword`
2. Click "Sign In"

**Expected Results:**
- ✅ Successful authentication
- ✅ Redirect back to frontend: `http://localhost:3000`
- ✅ Authentication code/token in URL parameters
- ✅ No errors in browser console

### Step 4: Token Validation

1. In browser dev tools, go to **Application** tab (Chrome) or **Storage** tab (Firefox)
2. Check **Local Storage** for authentication tokens
3. Check **Session Storage** for temporary auth data

**Expected Results:**
- ✅ Access token stored in browser storage
- ✅ Refresh token present (if configured)
- ✅ User info/profile data available

### Step 5: Protected Routes Testing

1. Navigate to protected pages/features
2. Verify authenticated user state

**Expected Results:**
- ✅ Access to protected content
- ✅ User information displayed
- ✅ Proper authentication state management

### Step 6: Logout Testing

1. Find and click logout button
2. Monitor console and network tabs

**Expected Results:**
- ✅ Tokens cleared from browser storage
- ✅ Redirect to Keycloak logout endpoint
- ✅ Redirect back to frontend in unauthenticated state
- ✅ No access to protected content

## 🔍 Common Issues to Check

### CSP Violations

Look for console errors like:
```
Refused to connect to 'http://localhost:8180' because it violates the following Content Security Policy directive...
```

**Solution**: Update CSP headers to allow Keycloak domain

### CORS Errors

Look for network errors like:
```
Access to fetch at 'http://localhost:8180/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution**: Configure CORS in Keycloak client settings

### Redirect URI Mismatch

Look for errors like:
```
Invalid redirect URI
```

**Solution**: Ensure redirect URIs in Keycloak client match frontend URLs

### Network Connectivity

Check for:
- Services not responding
- Port conflicts
- Docker container issues

## 📊 Test Results Checklist

### Services Status
- [ ] Frontend accessible at localhost:3000
- [ ] Keycloak accessible at localhost:8180
- [ ] API accessible at localhost:8000

### Keycloak Configuration
- [ ] ProjectFlow realm created
- [ ] Frontend client configured
- [ ] CORS settings correct
- [ ] Test user created

### Authentication Flow
- [ ] Login button triggers Keycloak redirect
- [ ] Keycloak login page loads
- [ ] User can authenticate successfully
- [ ] Redirect back to frontend works
- [ ] Tokens stored properly

### Security Compliance
- [ ] No CSP violations
- [ ] No CORS errors
- [ ] HTTPS redirects work (if applicable)
- [ ] Secure token storage

### User Experience
- [ ] Smooth authentication flow
- [ ] Clear error messages
- [ ] Proper logout functionality
- [ ] Session management works

## 🚨 Troubleshooting

### If Frontend Won't Load
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### If Keycloak Won't Load
```bash
docker-compose logs keycloak
docker-compose restart keycloak
```

### If Authentication Fails
1. Check Keycloak logs
2. Verify realm and client configuration
3. Check browser network tab for error responses
4. Verify user credentials

### If CSP Errors Persist
1. Check frontend CSP configuration
2. Update meta tags or response headers
3. Restart frontend service

## 📝 Documentation

After successful testing, document:
1. Working configuration settings
2. Any issues encountered and solutions
3. Performance observations
4. Recommendations for production deployment

---

**Last Updated**: September 19, 2025
**Test Environment**: Docker Compose with Keycloak 22.0, React frontend, Python FastAPI backend