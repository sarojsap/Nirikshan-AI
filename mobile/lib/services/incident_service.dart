import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../config/constants.dart';
import '../models/incident.dart';
import 'auth_service.dart';

class IncidentService {
  final AuthService _authService;
  final String? _organizationId;
  final String? _deviceId;

  IncidentService({
    AuthService? authService,
    String? organizationId,
    String? deviceId,
  })  : _authService = authService ?? AuthService(),
        _organizationId = organizationId,
        _deviceId = deviceId;

  Future<List<Incident>> getIncidents({int page = 1, int limit = 50}) async {
    final token = await _authService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('Session expired. Please log in again.');
    }

    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };

    if (_deviceId != null) {
      queryParams['deviceId'] = _deviceId!;
    }
    if (_organizationId != null) {
      queryParams['organizationId'] = _organizationId!;
    }

    final uri = Uri.parse(ApiConfig.incidentsEndpoint).replace(
      queryParameters: queryParams,
    );

    try {
      final response = await http
          .get(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(requestTimeout);

      final Map<String, dynamic> body = response.body.isNotEmpty
          ? jsonDecode(response.body) as Map<String, dynamic>
          : {};

      if (response.statusCode == 200) {
        final data = body['data'];
        if (data is! List) {
          return const [];
        }

        return data
            .whereType<Map<String, dynamic>>()
            .map(Incident.fromJson)
            .toList();
      }

      if (response.statusCode == 401) {
        throw Exception('Cloud session expired. Please sign out and log back in.');
      }

      throw Exception(
        body['error'] ?? body['message'] ?? 'Cloud backend returned status ${response.statusCode}',
      );
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Network timeout connecting to Cloud Backend');
    }
  }
}
