import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String defaultUrl = 'http://10.0.2.2:5000/api'; // Android Emulator default
  static const String _urlKey = 'backend_api_url';
  
  static String _currentUrl = defaultUrl;
  static bool _isConfigured = false;

  static String get baseUrl => _currentUrl;
  static bool get isConfigured => _isConfigured;

  // Dynamically constructed endpoint getters
  static String get loginEndpoint => '$baseUrl/auth/login';
  static String get logoutEndpoint => '$baseUrl/auth/logout';
  static String get getUserEndpoint => '$baseUrl/auth/me';
  static String get incidentsEndpoint => '$baseUrl/incidents';
  static String get registerNotificationEndpoint => '$baseUrl/notifications/register';
  static String get unregisterNotificationEndpoint => '$baseUrl/notifications/unregister';

  /// Load from SharedPreferences
  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _isConfigured = prefs.containsKey(_urlKey);
    _currentUrl = prefs.getString(_urlKey) ?? defaultUrl;
  }

  /// Save to SharedPreferences with sanitization
  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    var normalizedUrl = url.trim();

    // Ensure it starts with http:// or https://
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://$normalizedUrl';
    }

    // Remove trailing slash
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.substring(0, normalizedUrl.length - 1);
    }

    // Append /api suffix if not already present
    if (!normalizedUrl.endsWith('/api')) {
      normalizedUrl = '$normalizedUrl/api';
    }

    _currentUrl = normalizedUrl;
    _isConfigured = true;
    await prefs.setString(_urlKey, normalizedUrl);
  }

  /// Reset to default
  static Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_urlKey);
    _currentUrl = defaultUrl;
    _isConfigured = false;
  }
}
