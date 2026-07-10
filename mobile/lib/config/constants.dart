// API Configuration — points to production cloud backend
const String apiBaseUrl = 'https://cloud-backend-production-4a8f.up.railway.app/api';
const String apiOrigin = 'https://cloud-backend-production-4a8f.up.railway.app';

const String loginEndpoint = '$apiBaseUrl/auth/login';
const String logoutEndpoint = '$apiBaseUrl/auth/logout';
const String getUserEndpoint = '$apiBaseUrl/auth/me';
const String incidentsEndpoint = '$apiBaseUrl/incidents';

// Notification Endpoints
const String registerNotificationEndpoint =
    '$apiBaseUrl/notifications/register';
const String unregisterNotificationEndpoint =
    '$apiBaseUrl/notifications/unregister';

// Storage Keys
const String tokenKey = 'auth_token';
const String userKey = 'user_data';
const String emailKey = 'user_email';

// Request timeouts
const Duration requestTimeout = Duration(seconds: 30);

// App info
const String appVersion = '1.0.0';
const String appName = 'Nirikshan AI';
const String appBuildNumber = '1';
