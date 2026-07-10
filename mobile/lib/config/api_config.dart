class ApiConfig {
  static const String baseUrl = 'https://cloud-backend-production-4a8f.up.railway.app/api';

  static String get loginEndpoint => '$baseUrl/auth/login';
  static String get logoutEndpoint => '$baseUrl/auth/logout';
  static String get getUserEndpoint => '$baseUrl/auth/me';
  static String get incidentsEndpoint => '$baseUrl/incidents';
  static String get registerNotificationEndpoint => '$baseUrl/notifications/register';
  static String get unregisterNotificationEndpoint => '$baseUrl/notifications/unregister';

  /// No-op for backward compatibility — config is now hardcoded.
  static Future<void> load() async {}
}
