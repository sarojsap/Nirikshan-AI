import 'package:equatable/equatable.dart';

class Camera extends Equatable {
  final String id;
  final String name;
  final String location;
  final String status;

  const Camera({
    required this.id,
    required this.name,
    required this.location,
    required this.status,
  });

  factory Camera.fromJson(Map<String, dynamic> json) {
    return Camera(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Unknown camera',
      location: json['location'] ?? 'Surveillance area',
      status: json['status'] ?? 'ACTIVE',
    );
  }

  @override
  List<Object?> get props => [id, name, location, status];
}
