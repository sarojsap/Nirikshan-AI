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

  Future<List<Incident>> getIncidents({int page = 1, int limit = 30}) async {
    final token = await _authService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('You are not signed in.');
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

    final response = await http
        .get(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        )
        .timeout(requestTimeout);

    final body = jsonDecode(response.body) as Map<String, dynamic>;

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

    throw Exception(
      body['error'] ?? body['message'] ?? 'Failed to load events',
    );
  }
}
