// API Configuration
const String apiBaseUrl = 'http://10.0.2.2:5000/api';
const String apiOrigin = 'http://10.0.2.2:5000';
// Physical Android device: use this laptop's Wi-Fi IPv4 address.
// Android emulator: use http://10.0.2.2:5000/api instead.
// const String apiBaseUrl = 'https://your-domain.com/api'; // for production

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
