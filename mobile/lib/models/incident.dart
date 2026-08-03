import 'package:equatable/equatable.dart';

import '../config/constants.dart';
import 'camera.dart';

class Incident extends Equatable {
  final String id;
  final String type;
  final String description;
  final String severity;
  final String? imageUrl;
  final String? videoUrl;
  final DateTime timestamp;
  final Camera? camera;

  const Incident({
    required this.id,
    required this.type,
    required this.description,
    required this.severity,
    required this.timestamp,
    this.imageUrl,
    this.videoUrl,
    this.camera,
  });

  factory Incident.fromJson(Map<String, dynamic> json) {
    final timestampValue = json['timestamp'] ?? json['createdAt'];
    final cameraJson = json['camera'];

    return Incident(
      id: json['id'] ?? '',
      type: json['type'] ?? 'ALERT',
      description: json['description'] ?? 'An incident has been detected.',
      severity: json['severity'] ?? 'MEDIUM',
      imageUrl: json['imageUrl'] ?? json['snapshotUrl'],
      videoUrl: json['videoUrl'] ?? json['clipUrl'] ?? json['video_url'] ?? json['mediaUrl'],
      timestamp:
          DateTime.tryParse(timestampValue?.toString() ?? '') ?? DateTime.now(),
      camera: cameraJson is Map<String, dynamic>
          ? Camera.fromJson(cameraJson)
          : null,
    );
  }

  String get displayType => type.replaceAll('_', ' ');

  String get displayLocation => camera?.location ?? 'Surveillance area';

  String get displayCamera => camera?.name ?? 'Unknown camera';

  String? get resolvedImageUrl {
    final url = imageUrl;
    if (url == null || url.isEmpty) {
      return null;
    }

    final uri = Uri.tryParse(url);
    if (uri != null && uri.hasScheme) {
      return url;
    }

    if (url.startsWith('/')) {
      return '$apiOrigin$url';
    }

    return '$apiOrigin/$url';
  }

  String? get resolvedVideoUrl {
    final url = videoUrl;
    if (url == null || url.isEmpty) {
      return null;
    }

    String finalUrl = url;
    final uri = Uri.tryParse(url);
    if (uri != null && uri.hasScheme) {
      finalUrl = url;
    } else if (url.startsWith('/')) {
      finalUrl = '$apiOrigin$url';
    } else {
      finalUrl = '$apiOrigin/$url';
    }

    // Cloudinary ExoPlayer compatibility: ensure .mp4 extension for native Android playback
    if (finalUrl.contains('res.cloudinary.com') &&
        !finalUrl.contains('.mp4') &&
        !finalUrl.contains('.m3u8') &&
        !finalUrl.contains('.mov') &&
        !finalUrl.contains('.webm')) {
      final queryIndex = finalUrl.indexOf('?');
      if (queryIndex != -1) {
        finalUrl = '${finalUrl.substring(0, queryIndex)}.mp4${finalUrl.substring(queryIndex)}';
      } else {
        finalUrl = '$finalUrl.mp4';
      }
    }

    return finalUrl;
  }

  @override
  List<Object?> get props => [
    id,
    type,
    description,
    severity,
    imageUrl,
    videoUrl,
    timestamp,
    camera,
  ];
}
