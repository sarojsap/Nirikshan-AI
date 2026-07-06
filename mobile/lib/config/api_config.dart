import 'package:shared_preferences/shared_preferences.dart';

enum ConnectionMode { edge, cloud }

class ApiConfig {
  static const String defaultEdgeUrl = 'http://10.0.2.2:5000/api';
  static const String defaultCloudUrl = 'http://10.0.2.2:5001/api';
  static const String _urlKey = 'backend_api_url';
  static const String _modeKey = 'connection_mode';
  static const String _cloudUrlKey = 'cloud_api_url';

  static String _currentUrl = defaultEdgeUrl;
  static String _cloudUrl = defaultCloudUrl;
  static ConnectionMode _mode = ConnectionMode.edge;
  static bool _isConfigured = false;

  static String get baseUrl => _currentUrl;
  static String get cloudBaseUrl => _cloudUrl;
  static ConnectionMode get mode => _mode;
  static bool get isConfigured => _isConfigured;
  static bool get isCloudMode => _mode == ConnectionMode.cloud;

  static String get loginEndpoint => '$baseUrl/auth/login';
  static String get logoutEndpoint => '$baseUrl/auth/logout';
  static String get getUserEndpoint => '$baseUrl/auth/me';
  static String get incidentsEndpoint => '$baseUrl/incidents';
  static String get registerNotificationEndpoint => '$baseUrl/notifications/register';
  static String get unregisterNotificationEndpoint => '$baseUrl/notifications/unregister';

  static String sanitizeUrl(String url) {
    var normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'http://$normalized';
    }
    if (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    if (!normalized.endsWith('/api')) {
      normalized = '$normalized/api';
    }
    return normalized;
  }

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _isConfigured = prefs.containsKey(_urlKey);
    _currentUrl = prefs.getString(_urlKey) ?? defaultEdgeUrl;
    _cloudUrl = prefs.getString(_cloudUrlKey) ?? defaultCloudUrl;
    final modeStr = prefs.getString(_modeKey) ?? 'edge';
    _mode = modeStr == 'cloud' ? ConnectionMode.cloud : ConnectionMode.edge;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    _currentUrl = sanitizeUrl(url);
    _isConfigured = true;
    _mode = ConnectionMode.edge;
    await prefs.setString(_urlKey, _currentUrl);
    await prefs.setString(_modeKey, 'edge');
  }

  static Future<void> setCloudUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    _cloudUrl = sanitizeUrl(url);
    _currentUrl = _cloudUrl;
    _isConfigured = true;
    _mode = ConnectionMode.cloud;
    await prefs.setString(_cloudUrlKey, _cloudUrl);
    await prefs.setString(_modeKey, 'cloud');
  }

  static Future<void> switchToEdge(String edgeUrl) async {
    final prefs = await SharedPreferences.getInstance();
    _currentUrl = sanitizeUrl(edgeUrl);
    _mode = ConnectionMode.edge;
    await prefs.setString(_urlKey, _currentUrl);
    await prefs.setString(_modeKey, 'edge');
  }

  static Future<void> switchToCloud() async {
    _currentUrl = _cloudUrl;
    _mode = ConnectionMode.cloud;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_urlKey, _currentUrl);
    await prefs.setString(_modeKey, 'cloud');
  }

  static Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_urlKey);
    await prefs.remove(_cloudUrlKey);
    await prefs.remove(_modeKey);
    _currentUrl = defaultEdgeUrl;
    _cloudUrl = defaultCloudUrl;
    _mode = ConnectionMode.edge;
    _isConfigured = false;
  }
}
