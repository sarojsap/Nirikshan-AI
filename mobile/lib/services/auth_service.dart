import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import '../config/constants.dart';
import '../models/user.dart';

class AuthService {
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.loginEndpoint),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(requestTimeout);

      final body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200) {
        final data = body['data'] as Map<String, dynamic>? ?? {};
        final token = data['token'] as String?;
        final userJson = data['user'] as Map<String, dynamic>?;
        final user = userJson != null ? User.fromJson(userJson) : null;

        if (token == null || token.isEmpty || user == null) {
          return {
            'message': 'Invalid login response from server',
            'success': false,
          };
        }

        await _saveSession(token: token, user: user);

        return {'token': token, 'user': user, 'success': true};
      }

      return {
        'message': body['error'] ?? body['message'] ?? 'Login failed',
        'success': false,
      };
    } catch (e) {
      return {'message': 'Network error: ${e.toString()}', 'success': false};
    }
  }

  Future<void> _saveSession({required String token, required User user}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(tokenKey, token);
    await prefs.setString(emailKey, user.email);
    await prefs.setString(userKey, jsonEncode(user.toJson()));
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(tokenKey);
  }

  Future<String?> getEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(emailKey);
  }

  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString(userKey);
    if (userData == null || userData.isEmpty) {
      return null;
    }

    try {
      return User.fromJson(jsonDecode(userData) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(tokenKey);
    await prefs.remove(emailKey);
    await prefs.remove(userKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
