import 'dart:ui';
import 'package:flutter/material.dart';
import '../../models/incident.dart';

class StreamsTab extends StatefulWidget {
  final List<Incident> incidents;
  final bool isLoading;
  final String? error;
  final VoidCallback onRefresh;
  final Function(Incident) onIncidentTap;

  const StreamsTab({
    super.key,
    required this.incidents,
    required this.isLoading,
    required this.error,
    required this.onRefresh,
    required this.onIncidentTap,
  });

  @override
  State<StreamsTab> createState() => _StreamsTabState();
}

class _StreamsTabState extends State<StreamsTab> {
  String _activeFilter = 'ALL';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, dynamic>> _mockStreams = [
    {
      'id': 'cam-1',
      'name': 'Server Room B',
      'location': 'Interior, Floor 2',
      'imageUrl': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAd6kD3iy7nVzX1gsjUABwt9RYHS0Crf5yMQDnVeF-tywZVng6rV7af_uQZJ0T2yCntEtiurnrf0BNbu_vELp9RINQDglNyAIA4js1asiqbl1kaDCAeaarolSCvHnrcQDOr1DQvf1AIuEpIsjyLwT1HX8vjbG7P40bL_r4OHTXOqot_YQaz8v9b6LO2dGu4EZbObicqIw6JN-fMLSr2uYkUI9iZX13yr86KjrwOQi8wsxWdDpHcmdoL',
      'status': 'LIVE',
      'badge': 'Normal Activity',
      'badgeColor': Color(0xFF2E7D5B),
      'filter': 'INTERIOR',
    },
    {
      'id': 'cam-2',
      'name': 'Main Lobby',
      'location': 'Interior, Ground Floor',
      'imageUrl': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzppYMcGhHLAfM3ltCetLYm3PuK2J2YEhtAx4_AKzivRZ1ExgPujO1-BOXFT_F0u48xH3L9sC8bOnQ685bOKNmpsNzGgpjRVbHkE9cOwlgAfgvpM2Sthgy_JOi1TY7mYM5a1eOV9a2SCK0mDsdO16FBR0R2oapyvkG_B8JVH0yKgFy65a-jpZSKXE4LtDZE0AiNqE6wSX-1k3kp6z_KWK6Fu4Vpbm8IHDX0_3rj29RyaanuS1FhG-C',
      'status': 'LIVE',
      'badge': '3 Persons',
      'badgeColor': Color(0xFF75593F),
      'filter': 'INTERIOR',
    },
    {
      'id': 'cam-3',
      'name': 'North Perimeter',
      'location': 'Perimeter, Gate 1',
      'imageUrl': 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5XkQ1VhPBIYU2utUQABj0ilqBPSGdY_wUa4mhn1oxMRb2CAGf95gqI1QuZPnQsVGRTnvHDm09vnXjnzQZRRfrUe8Ist3EnQM8-UH2BKdGojmpwA7DFPEL5pzEUpHtJj-ze0xKXlA3hPayZhBMVefdWzNIg3_y3fVKL8ijL-iUvdY_ffhZjDexa2YYMwWa8-2mOXlTdQCSzhQqZwpN2Cwr8A10BVUJTyK4XYq_rtOm7Mv2ae6PWrFS',
      'status': 'LIVE',
      'badge': 'Nominal',
      'badgeColor': Color(0xFF2E7D5B),
      'filter': 'PERIMETER',
    },
    {
      'id': 'cam-4',
      'name': 'Corridor 4A',
      'location': 'Interior, West Wing',
      'imageUrl': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWBPeGfipPEk7X8lf6Ljj1MSs9-sB5h_J-yFQGJu0RCzg8WOtkCeuYk8Qrm5SIKS9PW2zEvvz-EJgkBCs9hVpOq7oYB-GHMOadNvd27Ycmyej8CDK3cI8zQ4p6iL6XTQWbiNyb1AfmSMJgjOozmmJ6uGp89xr_qs6p09AJWNbospYCW7_hFpYBFAN5ewVOJm_0xpH-vcqFK73jKJg9Yxoq3Gl2ovN5MN4zuk0F6hBS9WuyTNQ-17pB',
      'status': 'ALERT',
      'badge': 'Unrecognized Badge',
      'badgeColor': Color(0xFFBA1A1A),
      'filter': 'ENTRY POINTS',
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredStreams {
    return _mockStreams.where((stream) {
      final name = stream['name'].toString().toLowerCase();
      final location = stream['location'].toString().toLowerCase();
      final query = _searchQuery.toLowerCase();

      final matchesQuery = name.contains(query) || location.contains(query);
      if (!matchesQuery) return false;

      if (_activeFilter != 'ALL') {
        if (stream['filter'] != _activeFilter) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredStreams;

    return Column(
      children: [
        // ─── Search & Header Section (Matches code.html header) ───
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Surveillance Feeds',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1D14),
                      letterSpacing: -0.3,
                    ),
                  ),
                  GestureDetector(
                    onTap: widget.onRefresh,
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFFECEEDF).withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.refresh_rounded,
                        color: Color(0xFF81756C),
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Recessed Search Input
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(
                      color: Color(0xFF1A1D14),
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search streams...',
                      hintStyle: const TextStyle(color: Color(0xFF9A8E84)),
                      filled: true,
                      fillColor: const Color(0xFFECEEDF).withValues(alpha: 0.8),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        color: Color(0xFF81756C),
                        size: 20,
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear,
                                  color: Color(0xFF81756C), size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(
                          color: const Color(0xFFD3C4B9).withValues(alpha: 0.5),
                          width: 0.5,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: Color(0xFFCFAB8D),
                          width: 1.5,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'All'),
                    const SizedBox(width: 8),
                    _buildFilterChip('INTERIOR', 'Interior'),
                    const SizedBox(width: 8),
                    _buildFilterChip('PERIMETER', 'Perimeter'),
                    const SizedBox(width: 8),
                    _buildFilterChip('ENTRY POINTS', 'Entry Points'),
                  ],
                ),
              ),
            ],
          ),
        ),

        // ─── Camera Grid View ───
        Expanded(
          child: ListView.builder(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 110),
            itemCount: filtered.length + 1, // +1 for the Add Stream card
            itemBuilder: (context, index) {
              if (index == filtered.length) {
                return _buildAddStreamCard();
              }
              return _buildCameraCard(filtered[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _activeFilter == filterKey;
    return GestureDetector(
      onTap: () => setState(() => _activeFilter = filterKey),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFFCFAB8D).withValues(alpha: 0.15)
              : const Color(0xFFECEEDF).withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(9999),
          border: Border.all(
            color: isSelected
                ? const Color(0xFFCFAB8D)
                : const Color(0xFFD3C4B9).withValues(alpha: 0.5),
            width: isSelected ? 1.0 : 0.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? const Color(0xFF75593F) : const Color(0xFF81756C),
          ),
        ),
      ),
    );
  }

  Widget _buildCameraCard(Map<String, dynamic> stream) {
    final isAlert = stream['status'] == 'ALERT';
    final badgeColor = stream['badgeColor'] as Color;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Container(
          height: 280,
          decoration: BoxDecoration(
            color: const Color(0xFFECEEDF),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: const Color(0xFFCFAB8D).withValues(alpha: 0.25),
              width: 0.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF75593F).withValues(alpha: 0.05),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Background Image
              Positioned.fill(
                child: Image.network(
                  stream['imageUrl'],
                  fit: BoxFit.cover,
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return Container(
                      color: const Color(0xFFECEEDF),
                      child: const Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2.0,
                          color: Color(0xFFCFAB8D),
                        ),
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: const Color(0xFFECEEDF),
                      child: const Center(
                        child: Icon(Icons.videocam_off_outlined,
                            size: 40, color: Color(0xFF81756C)),
                      ),
                    );
                  },
                ),
              ),

              // Semi-transparent Overlay
              Positioned.fill(
                child: Container(
                  color: Colors.black.withValues(alpha: 0.15),
                ),
              ),

              // Top details
              Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Live / Alert badge
                        ClipRRect(
                          borderRadius: BorderRadius.circular(9999),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isAlert
                                    ? const Color(0xFFBA1A1A).withValues(alpha: 0.85)
                                    : Colors.black.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(9999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (isAlert)
                                    const Icon(Icons.warning_amber_rounded,
                                        size: 12, color: Colors.white)
                                  else
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  const SizedBox(width: 4),
                                  Text(
                                    isAlert ? 'ALERT' : 'LIVE',
                                    style: const TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          stream['name'],
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            shadows: [
                              Shadow(
                                color: Colors.black54,
                                blurRadius: 4,
                                offset: Offset(0, 1),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          stream['location'],
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.8),
                            shadows: const [
                              Shadow(
                                color: Colors.black54,
                                blurRadius: 4,
                                offset: Offset(0, 1),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    // Fullscreen Button
                    GestureDetector(
                      onTap: () {
                        // Find if there is a matching incident to tap, or show dialog
                        final match = widget.incidents.firstWhere(
                          (inc) =>
                              inc.camera?.name == stream['name'] ||
                              inc.displayCamera == stream['name'],
                          orElse: () => Incident(
                            id: stream['id'],
                            type: stream['status'],
                            severity: isAlert ? 'CRITICAL' : 'LOW',
                            description: 'Live surveillance monitoring',
                            timestamp: DateTime.now(),
                            imageUrl: stream['imageUrl'],
                          ),
                        );
                        widget.onIncidentTap(match);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.fullscreen_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Bottom status tag overlay (Floating AI chips)
              Positioned(
                bottom: 16,
                left: 16,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white24,
                          width: 0.5,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: badgeColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            stream['badge'],
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Hover/Tap Analyze button overlay
              Positioned(
                right: 16,
                bottom: 16,
                child: GestureDetector(
                  onTap: () {
                    // Match incident
                    final match = widget.incidents.firstWhere(
                      (inc) =>
                          inc.camera?.name == stream['name'] ||
                          inc.displayCamera == stream['name'],
                      orElse: () => Incident(
                        id: stream['id'],
                        type: stream['status'],
                        severity: isAlert ? 'CRITICAL' : 'LOW',
                        description: 'Live surveillance monitoring',
                        timestamp: DateTime.now(),
                        imageUrl: stream['imageUrl'],
                      ),
                    );
                    widget.onIncidentTap(match);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFCFAB8D),
                      borderRadius: BorderRadius.circular(9999),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.analytics_outlined,
                            size: 14, color: Color(0xFF593F28)),
                        SizedBox(width: 4),
                        Text(
                          'Analyze',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF593F28),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAddStreamCard() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Container(
        height: 180,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: const Color(0xFFCFAB8D).withValues(alpha: 0.5),
            width: 1.5,
            style: BorderStyle.solid, // Note: Flutter doesn't native support dashed border directly in Border
          ),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(24),
          child: InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add Stream functionality active')),
              );
            },
            borderRadius: BorderRadius.circular(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFCFAB8D).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.add_rounded,
                    color: Color(0xFF75593F),
                    size: 28,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Add Stream',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF75593F),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
