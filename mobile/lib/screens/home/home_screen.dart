import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:video_player/video_player.dart';

import '../../bloc/auth/bloc.dart';
import '../../config/theme.dart';
import '../../models/incident.dart';
import '../../models/user.dart';
import '../../services/incident_service.dart';
import '../../services/notification_service.dart';

import 'dashboard_tab.dart';
import 'incidents_tab.dart';
import 'settings_tab.dart';

class HomeScreen extends StatefulWidget {
  final User user;
  final bool initializeNotifications;

  const HomeScreen({
    super.key,
    required this.user,
    this.initializeNotifications = true,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final IncidentService _incidentService;
  int _currentTabIndex = 0;

  String? _organizationId;
  String? _deviceId;

  List<Incident> _incidents = const [];
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _error;
  DateTime? _lastUpdated;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _incidentService = IncidentService(
      organizationId: _organizationId,
      deviceId: _deviceId,
    );
    if (widget.initializeNotifications) {
      NotificationService().initialize();
    }
    _loadIncidents();
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _loadIncidents(silent: true);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  // ignore: unused_element
  void _setDeviceFilter({String? organizationId, String? deviceId}) {
    setState(() {
      _organizationId = organizationId;
      _deviceId = deviceId;
    });
    _incidentService = IncidentService(
      organizationId: organizationId ?? _organizationId,
      deviceId: deviceId ?? _deviceId,
    );
    _loadIncidents();
  }

  Future<void> _loadIncidents({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = _incidents.isEmpty;
        _isRefreshing = _incidents.isNotEmpty;
        _error = null;
      });
    }

    try {
      final incidents = await _incidentService.getIncidents(limit: 50);
      if (!mounted) return;
      setState(() {
        _incidents = incidents;
        _lastUpdated = DateTime.now();
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFFF9FBEB),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text(
          'Sign Out',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: Color(0xFF1A1D14),
          ),
        ),
        content: const Text(
          'Are you sure you want to sign out?',
          style: TextStyle(color: Color(0xFF4F453D)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFF81756C)),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFBA1A1A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await NotificationService().unregister();
      if (!mounted) return;
      context.read<AuthBloc>().add(const LogoutRequested());
    }
  }

  void _showIncidentDetails(Incident incident) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF9FBEB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return _IncidentDetailsSheet(incident: incident);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFBBDCE5),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFBBDCE5),
              Color(0xFFCDD9D0),
              Color(0xFFD9DBCD),
            ],
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // ─── Top App Bar ───
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 4),
                child: Row(
                  children: [
                    // Officer profile avatar circle (Stitch style)
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFFD3C4B9),
                          width: 1.0,
                        ),
                      ),
                      child: ClipOval(
                        child: Image.network(
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuAodZ47OvyrSS8LRNYSV2Py9eu5rsh8YaIutnflvOJY5Icezt1oHqkAdaQXj1RpFLs8xxiuJ6gj2XVqFh7rXe_taLAyDFXzLeifP9hSPFAzrvr8WP_bOpz1PKvnRrlT3Ji9b1OfKdN--SHSCYgod2E9xTbLIdAfNg91Z9yabcM6gV_RoHjFf-_d0pDhkF5dC5MddZowbW5VtxhClz_zaTkgBSJ0038WQuPHDcNP5riSwrHvZoHKo0VH',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              Container(
                            color: const Color(0xFFCFAB8D),
                            child: Center(
                              child: Text(
                                widget.user.name.isNotEmpty
                                    ? widget.user.name[0].toUpperCase()
                                    : 'U',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF593F28),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Nirikshan AI',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1D14),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const Spacer(),
                    // Refresh
                    GestureDetector(
                      onTap: _isRefreshing ? null : () => _loadIncidents(),
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFFECEEDF)
                              .withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: _isRefreshing
                            ? const Padding(
                                padding: EdgeInsets.all(9),
                                child: CircularProgressIndicator(
                                  strokeWidth: 1.5,
                                  color: Color(0xFF75593F),
                                ),
                              )
                            : const Icon(Icons.refresh_rounded,
                                color: Color(0xFF81756C), size: 20),
                      ),
                    ),
                  ],
                ),
              ),

              // ─── Tab Content ───
              Expanded(
                child: IndexedStack(
                  index: _currentTabIndex,
                  children: [
                    DashboardTab(
                      user: widget.user,
                      incidents: _incidents,
                      isLoading: _isLoading,
                      isRefreshing: _isRefreshing,
                      error: _error,
                      lastUpdated: _lastUpdated,
                      onRefresh: _loadIncidents,
                      onViewAllTap: () =>
                          setState(() => _currentTabIndex = 1),
                      onIncidentTap: _showIncidentDetails,
                    ),
                    IncidentsTab(
                      incidents: _incidents,
                      isLoading: _isLoading,
                      error: _error,
                      onRefresh: _loadIncidents,
                      onIncidentTap: _showIncidentDetails,
                    ),
                    SettingsTab(
                      user: widget.user,
                      onLogout: _handleLogout,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),

      // ─── Floating Glass Bottom Navigation ───
      extendBody: true,
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
            child: Container(
              height: 70,
              decoration: BoxDecoration(
                color: const Color(0xFFECEEDF).withValues(alpha: 0.82),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: const Color(0xFFCFAB8D).withValues(alpha: 0.2),
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF75593F).withValues(alpha: 0.08),
                    blurRadius: 30,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _NavItem(
                    icon: Icons.dashboard_outlined,
                    activeIcon: Icons.dashboard_rounded,
                    label: 'Command',
                    isActive: _currentTabIndex == 0,
                    onTap: () => setState(() => _currentTabIndex = 0),
                  ),
                  _NavItem(
                    icon: Icons.shield_outlined,
                    activeIcon: Icons.shield_rounded,
                    label: 'Incidents',
                    isActive: _currentTabIndex == 1,
                    badgeCount: _incidents.length,
                    onTap: () => setState(() => _currentTabIndex = 1),
                  ),
                  _NavItem(
                    icon: Icons.settings_outlined,
                    activeIcon: Icons.settings_rounded,
                    label: 'Settings',
                    isActive: _currentTabIndex == 2,
                    onTap: () => setState(() => _currentTabIndex = 2),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Floating Nav Item ───
class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final int badgeCount;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    this.badgeCount = 0,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isActive ? 20 : 16,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: isActive
              ? const Color(0xFFCFAB8D)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  isActive ? activeIcon : icon,
                  size: 22,
                  color: isActive
                      ? const Color(0xFF593F28)
                      : const Color(0xFF81756C),
                ),
                if (badgeCount > 0 && !isActive)
                  Positioned(
                    top: -4,
                    right: -6,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFBA1A1A),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive
                    ? const Color(0xFF593F28)
                    : const Color(0xFF81756C),
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Shared Widgets — Redesigned for Earth & Atmosphere palette
// ═══════════════════════════════════════════════════════════════

class IncidentCard extends StatelessWidget {
  final Incident incident;
  final VoidCallback onTap;

  const IncidentCard({super.key, required this.incident, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final severityColor = severityColorOf(incident.severity);

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFFECEEDF).withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: const Color(0xFFCFAB8D).withValues(alpha: 0.2),
              width: 0.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF75593F).withValues(alpha: 0.04),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(24),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(23)),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: SnapshotImage(url: incident.resolvedImageUrl),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                incident.displayType,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF1A1D14),
                                ),
                              ),
                            ),
                            SeverityChip(
                              severity: incident.severity,
                              color: severityColor,
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          incident.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF4F453D),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            MetaText(
                              icon: Icons.videocam_outlined,
                              text: incident.displayCamera,
                            ),
                            const Spacer(),
                            MetaText(
                              icon: Icons.schedule_outlined,
                              text: formatDateTime(incident.timestamp),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _IncidentDetailsSheet extends StatefulWidget {
  final Incident incident;

  const _IncidentDetailsSheet({required this.incident});

  @override
  State<_IncidentDetailsSheet> createState() => _IncidentDetailsSheetState();
}

class _IncidentDetailsSheetState extends State<_IncidentDetailsSheet> {
  bool _showVideo = false;

  @override
  void initState() {
    super.initState();
    _showVideo = false;
  }

  @override
  Widget build(BuildContext context) {
    final severityColor = severityColorOf(widget.incident.severity);
    final videoUrl = widget.incident.resolvedVideoUrl;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.90,
      minChildSize: 0.5,
      maxChildSize: 0.96,
      builder: (context, scrollController) {
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 36),
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD3C4B9),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Tab Switcher
            if (videoUrl != null) ...[
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE7E9DB),
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _showVideo = true),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _showVideo
                                ? const Color(0xFFCFAB8D)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.play_circle_fill,
                                  size: 16,
                                  color: _showVideo
                                      ? const Color(0xFF593F28)
                                      : const Color(0xFF81756C)),
                              const SizedBox(width: 6),
                              Text(
                                'Video',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: _showVideo
                                      ? const Color(0xFF593F28)
                                      : const Color(0xFF81756C),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _showVideo = false),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !_showVideo
                                ? const Color(0xFFCFAB8D)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.image_outlined,
                                  size: 16,
                                  color: !_showVideo
                                      ? const Color(0xFF593F28)
                                      : const Color(0xFF81756C)),
                              const SizedBox(width: 6),
                              Text(
                                'Snapshot',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: !_showVideo
                                      ? const Color(0xFF593F28)
                                      : const Color(0xFF81756C),
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
              const SizedBox(height: 16),
            ],

            // Media
            if (videoUrl != null && _showVideo)
              _IncidentVideoPlayer(videoUrl: videoUrl)
            else
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: SnapshotImage(url: widget.incident.resolvedImageUrl),
                ),
              ),
            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.incident.displayType,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1D14),
                    ),
                  ),
                ),
                SeverityChip(
                  severity: widget.incident.severity,
                  color: severityColor,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'ID: ${widget.incident.id}',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: Color(0xFF81756C),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 20),

            DetailBlock(
              label: 'Description',
              icon: Icons.notes_outlined,
              child: Text(
                widget.incident.description,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF1A1D14),
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 12),

            DetailBlock(
              label: 'Camera & Location',
              icon: Icons.videocam_outlined,
              child: Text(
                '${widget.incident.displayCamera} • ${widget.incident.displayLocation}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF1A1D14),
                ),
              ),
            ),
            const SizedBox(height: 12),

            DetailBlock(
              label: 'Timestamp',
              icon: Icons.schedule_outlined,
              child: Text(
                formatDateTime(widget.incident.timestamp),
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF1A1D14),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _IncidentVideoPlayer extends StatefulWidget {
  final String videoUrl;

  const _IncidentVideoPlayer({required this.videoUrl});

  @override
  State<_IncidentVideoPlayer> createState() => _IncidentVideoPlayerState();
}

class _IncidentVideoPlayerState extends State<_IncidentVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  double _currentSpeed = 1.0;
  final List<double> _speeds = const [0.5, 1.0, 1.25, 1.5, 2.0];

  String get _effectiveUrl {
    var url = widget.videoUrl;
    if (url.contains('localhost')) {
      url = url.replaceAll('localhost', '10.0.2.2');
    } else if (url.contains('127.0.0.1')) {
      url = url.replaceAll('127.0.0.1', '10.0.2.2');
    }
    if (url.contains('res.cloudinary.com') &&
        !url.contains('.mp4') &&
        !url.contains('.m3u8') &&
        !url.contains('.mov')) {
      final queryIndex = url.indexOf('?');
      if (queryIndex != -1) {
        url =
            '${url.substring(0, queryIndex)}.mp4${url.substring(queryIndex)}';
      } else {
        url = '$url.mp4';
      }
    }
    return url;
  }

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  @override
  void didUpdateWidget(covariant _IncidentVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl) {
      _initVideo();
    }
  }

  void _initVideo() {
    _controller?.dispose();

    setState(() {
      _hasError = false;
      _isInitialized = false;
      _currentSpeed = 1.0;
    });

    final url = _effectiveUrl;
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(url),
      httpHeaders: const {
        'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    );

    _controller = controller;

    controller.initialize().then((_) {
      if (mounted && _controller == controller) {
        setState(() {
          _isInitialized = true;
        });
        controller.addListener(() {
          if (mounted) setState(() {});
        });
        controller.play();
        controller.setLooping(true);
      }
    }).catchError((error) {
      if (mounted && _controller == controller) {
        setState(() {
          _hasError = true;
        });
      }
    });
  }

  void _seekRelative(int seconds) {
    if (_controller == null || !_isInitialized) return;
    final currentPos = _controller!.value.position;
    final targetPos = currentPos + Duration(seconds: seconds);
    final maxDuration = _controller!.value.duration;

    if (targetPos < Duration.zero) {
      _controller!.seekTo(Duration.zero);
    } else if (targetPos > maxDuration) {
      _controller!.seekTo(maxDuration);
    } else {
      _controller!.seekTo(targetPos);
    }
  }

  void _cycleSpeed() {
    if (_controller == null || !_isInitialized) return;
    final currentIndex = _speeds.indexOf(_currentSpeed);
    final nextIndex = (currentIndex + 1) % _speeds.length;
    final nextSpeed = _speeds[nextIndex];
    setState(() {
      _currentSpeed = nextSpeed;
      _controller!.setPlaybackSpeed(nextSpeed);
    });
  }

  void _openFullScreenPlayer(BuildContext context) {
    if (_controller == null || !_isInitialized) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _FullScreenVideoViewer(
          controller: _controller!,
          effectiveUrl: _effectiveUrl,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        height: 200,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFE7E9DB),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.video_library_outlined,
                color: Color(0xFF81756C), size: 32),
            const SizedBox(height: 8),
            const Text(
              'Unable to load video',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1A1D14),
              ),
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _initVideo,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFCFAB8D),
                  borderRadius: BorderRadius.circular(9999),
                ),
                child: const Text(
                  'Retry',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF593F28),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (!_isInitialized || _controller == null) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: const Color(0xFFE7E9DB),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Center(
          child: CircularProgressIndicator(
            color: Color(0xFFCFAB8D),
            strokeWidth: 2.0,
          ),
        ),
      );
    }

    final isPlaying = _controller!.value.isPlaying;
    final position = _controller!.value.position;
    final duration = _controller!.value.duration;

    return Container(
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(20),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          alignment: Alignment.center,
          children: [
            AspectRatio(
              aspectRatio: _controller!.value.aspectRatio > 0
                  ? _controller!.value.aspectRatio
                  : 16 / 9,
              child: VideoPlayer(_controller!),
            ),
            // Speed & Fullscreen
            Positioned(
              top: 8,
              left: 10,
              right: 10,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: _cycleSpeed,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      child: Text(
                        '${_currentSpeed}x',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _openFullScreenPlayer(context),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.fullscreen,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Play controls
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GestureDetector(
                  onTap: () => _seekRelative(-5),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.replay_5,
                        color: Colors.white, size: 26),
                  ),
                ),
                const SizedBox(width: 20),
                GestureDetector(
                  onTap: () {
                    setState(() {
                      isPlaying
                          ? _controller!.pause()
                          : _controller!.play();
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      color: Color(0xFFCFAB8D),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isPlaying ? Icons.pause : Icons.play_arrow,
                      color: const Color(0xFF593F28),
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                GestureDetector(
                  onTap: () => _seekRelative(5),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.forward_5,
                        color: Colors.white, size: 26),
                  ),
                ),
              ],
            ),
            // Progress bar
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(10, 4, 10, 6),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.transparent, Colors.black54],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    VideoProgressIndicator(
                      _controller!,
                      allowScrubbing: true,
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      colors: const VideoProgressColors(
                        playedColor: Color(0xFFCFAB8D),
                        bufferedColor: Colors.white24,
                        backgroundColor: Colors.white10,
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${formatDuration(position)} / ${formatDuration(duration)}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white70,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FullScreenVideoViewer extends StatefulWidget {
  final VideoPlayerController controller;
  final String effectiveUrl;

  const _FullScreenVideoViewer({
    required this.controller,
    required this.effectiveUrl,
  });

  @override
  State<_FullScreenVideoViewer> createState() => _FullScreenVideoViewerState();
}

class _FullScreenVideoViewerState extends State<_FullScreenVideoViewer> {
  late double _currentSpeed;

  @override
  void initState() {
    super.initState();
    _currentSpeed = widget.controller.value.playbackSpeed;
    widget.controller.addListener(_updateState);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_updateState);
    super.dispose();
  }

  void _updateState() {
    if (mounted) setState(() {});
  }

  void _seekRelative(int seconds) {
    final currentPos = widget.controller.value.position;
    final targetPos = currentPos + Duration(seconds: seconds);
    final maxDuration = widget.controller.value.duration;

    if (targetPos < Duration.zero) {
      widget.controller.seekTo(Duration.zero);
    } else if (targetPos > maxDuration) {
      widget.controller.seekTo(maxDuration);
    } else {
      widget.controller.seekTo(targetPos);
    }
  }

  void _changeSpeed(double speed) {
    setState(() {
      _currentSpeed = speed;
      widget.controller.setPlaybackSpeed(speed);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isPlaying = widget.controller.value.isPlaying;
    final position = widget.controller.value.position;
    final duration = widget.controller.value.duration;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          alignment: Alignment.center,
          children: [
            Center(
              child: AspectRatio(
                aspectRatio: widget.controller.value.aspectRatio > 0
                    ? widget.controller.value.aspectRatio
                    : 16 / 9,
                child: VideoPlayer(widget.controller),
              ),
            ),
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 28),
                    onPressed: () => Navigator.pop(context),
                  ),
                  PopupMenuButton<double>(
                    initialValue: _currentSpeed,
                    onSelected: _changeSpeed,
                    color: const Color(0xFFF9FBEB),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      child: Text(
                        '${_currentSpeed}x',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    itemBuilder: (context) =>
                        [0.5, 1.0, 1.25, 1.5, 2.0].map((speed) {
                      return PopupMenuItem<double>(
                        value: speed,
                        child: Text(
                          '${speed}x',
                          style: TextStyle(
                            color: _currentSpeed == speed
                                ? const Color(0xFF75593F)
                                : const Color(0xFF1A1D14),
                            fontWeight: _currentSpeed == speed
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GestureDetector(
                  onTap: () => _seekRelative(-5),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      shape: BoxShape.circle,
                    ),
                    child:
                        const Icon(Icons.replay_5, color: Colors.white, size: 36),
                  ),
                ),
                const SizedBox(width: 32),
                GestureDetector(
                  onTap: () {
                    setState(() {
                      isPlaying
                          ? widget.controller.pause()
                          : widget.controller.play();
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Color(0xFFCFAB8D),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isPlaying ? Icons.pause : Icons.play_arrow,
                      color: const Color(0xFF593F28),
                      size: 38,
                    ),
                  ),
                ),
                const SizedBox(width: 32),
                GestureDetector(
                  onTap: () => _seekRelative(5),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.forward_5,
                        color: Colors.white, size: 36),
                  ),
                ),
              ],
            ),
            Positioned(
              bottom: 20,
              left: 20,
              right: 20,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  VideoProgressIndicator(
                    widget.controller,
                    allowScrubbing: true,
                    colors: const VideoProgressColors(
                      playedColor: Color(0xFFCFAB8D),
                      bufferedColor: Colors.white24,
                      backgroundColor: Colors.white10,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${formatDuration(position)} / ${formatDuration(duration)}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                          fontFamily: 'monospace',
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.fullscreen_exit,
                            color: Colors.white, size: 26),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SnapshotImage extends StatelessWidget {
  final String? url;

  const SnapshotImage({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    if (url == null) {
      return const MissingSnapshot();
    }

    if (url!.startsWith('data:image')) {
      final commaIndex = url!.indexOf(',');
      if (commaIndex != -1) {
        try {
          final bytes = base64Decode(url!.substring(commaIndex + 1));
          return Image.memory(
            bytes,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                const MissingSnapshot(),
          );
        } catch (_) {
          return const MissingSnapshot();
        }
      }
    }

    return Image.network(
      url!,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: const Color(0xFFE7E9DB),
          child: const Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Color(0xFFCFAB8D),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) => const MissingSnapshot(),
    );
  }
}

class MissingSnapshot extends StatelessWidget {
  const MissingSnapshot({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFE7E9DB),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.image_not_supported_outlined,
            size: 32,
            color: Color(0xFF81756C),
          ),
          SizedBox(height: 6),
          Text(
            'No snapshot available',
            style: TextStyle(
              fontSize: 11,
              color: Color(0xFF81756C),
            ),
          ),
        ],
      ),
    );
  }
}

class SeverityChip extends StatelessWidget {
  final String severity;
  final Color color;

  const SeverityChip({super.key, required this.severity, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        severity,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class MetaText extends StatelessWidget {
  final IconData icon;
  final String text;

  const MetaText({super.key, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: const Color(0xFF81756C), size: 14),
        const SizedBox(width: 4),
        Text(
          text,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(0xFF81756C),
          ),
        ),
      ],
    );
  }
}

class DetailBlock extends StatelessWidget {
  final String label;
  final IconData icon;
  final Widget child;

  const DetailBlock({
    super.key,
    required this.label,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFE7E9DB),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF75593F)),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF75593F),
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class StatusPanel extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Color color;

  const StatusPanel({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFECEEDF).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFD3C4B9).withValues(alpha: 0.4),
          width: 0.5,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 36),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1A1D14),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF81756C),
            ),
          ),
        ],
      ),
    );
  }
}

Color severityColorOf(String severity) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return AppTheme.severityCritical;
    case 'HIGH':
      return AppTheme.severityHigh;
    case 'LOW':
      return AppTheme.severityLow;
    case 'MEDIUM':
    default:
      return AppTheme.severityMedium;
  }
}

String formatClock(DateTime dateTime) {
  final local = dateTime.toLocal();
  return '${twoDigits(local.hour)}:${twoDigits(local.minute)}';
}

String formatDateTime(DateTime dateTime) {
  final local = dateTime.toLocal();
  return '${local.year}-${twoDigits(local.month)}-${twoDigits(local.day)} '
      '${twoDigits(local.hour)}:${twoDigits(local.minute)}';
}

String formatDuration(Duration duration) {
  final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
  return '$minutes:$seconds';
}

String twoDigits(int value) => value.toString().padLeft(2, '0');
