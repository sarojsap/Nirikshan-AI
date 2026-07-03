// API Configuration
const String apiBaseUrl = 'http://192.168.110.29:5000/api';
// Change to your backend IP/URL when deploying.
// const String apiBaseUrl = 'https://your-domain.com/api'; // for production

const String loginEndpoint = '$apiBaseUrl/auth/login';
const String logoutEndpoint = '$apiBaseUrl/auth/logout';
const String getUserEndpoint = '$apiBaseUrl/auth/me';

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
