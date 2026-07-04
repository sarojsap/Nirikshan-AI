import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../config/constants.dart';
import '../models/incident.dart';
import 'auth_service.dart';

class IncidentService {
  final AuthService _authService;

  IncidentService({AuthService? authService})
    : _authService = authService ?? AuthService();

  Future<List<Incident>> getIncidents({int page = 1, int limit = 30}) async {
    final token = await _authService.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('You are not signed in.');
    }

    final uri = Uri.parse(ApiConfig.incidentsEndpoint).replace(
      queryParameters: {'page': page.toString(), 'limit': limit.toString()},
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
