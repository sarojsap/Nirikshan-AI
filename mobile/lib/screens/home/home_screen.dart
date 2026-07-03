import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/auth/bloc.dart';
import '../../config/theme.dart';
import '../../models/incident.dart';
import '../../models/user.dart';
import '../../services/incident_service.dart';
import '../../services/notification_service.dart';

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
  final IncidentService _incidentService = IncidentService();

  List<Incident> _incidents = const [];
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _error;
  DateTime? _lastUpdated;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
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

  Future<void> _loadIncidents({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = _incidents.isEmpty;
        _isRefreshing = _incidents.isNotEmpty;
        _error = null;
      });
    }

    try {
      final incidents = await _incidentService.getIncidents(limit: 30);
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
    await NotificationService().unregister();
    if (!mounted) return;
    context.read<AuthBloc>().add(const LogoutRequested());
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.user.role.toUpperCase();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('NIRIKSHAN AI'),
        actions: [
          IconButton(
            tooltip: 'Refresh events',
            icon: _isRefreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : () => _loadIncidents(),
          ),
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _loadIncidents(),
          color: AppTheme.tertiary,
          backgroundColor: AppTheme.surfaceContainer,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                  child: _Header(
                    user: widget.user,
                    role: role,
                    incidentCount: _incidents.length,
                    lastUpdated: _lastUpdated,
                  ),
                ),
              ),
              if (_error != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: _StatusPanel(
                      icon: Icons.warning_amber,
                      title: 'Unable to load events',
                      message: _error!,
                      color: AppTheme.error,
                    ),
                  ),
                ),
              if (_isLoading)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_incidents.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: _StatusPanel(
                      icon: Icons.notifications_none,
                      title: 'No events captured yet',
                      message:
                          'New intrusion and crowd snapshots will appear here.',
                      color: AppTheme.tertiary,
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  sliver: SliverList.separated(
                    itemBuilder: (context, index) {
                      final incident = _incidents[index];
                      return _IncidentCard(
                        incident: incident,
                        onTap: () => _showIncidentDetails(incident),
                      );
                    },
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 12),
                    itemCount: _incidents.length,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showIncidentDetails(Incident incident) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
      ),
      builder: (context) {
        return _IncidentDetailsSheet(incident: incident);
      },
    );
  }
}

class _Header extends StatelessWidget {
  final User user;
  final String role;
  final int incidentCount;
  final DateTime? lastUpdated;

  const _Header({
    required this.user,
    required this.role,
    required this.incidentCount,
    required this.lastUpdated,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [_RoleChip(role: role)]),
        const SizedBox(height: 18),
        Text(
          'Event Snapshots',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: AppTheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Review detected intrusions and crowd events with captured frames.',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: AppTheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _MetricTile(
                label: 'Events',
                value: incidentCount.toString(),
                icon: Icons.sensors,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MetricTile(
                label: 'Updated',
                value: lastUpdated == null
                    ? '--:--'
                    : _formatClock(lastUpdated!),
                icon: Icons.schedule,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _IncidentCard extends StatelessWidget {
  final Incident incident;
  final VoidCallback onTap;

  const _IncidentCard({required this.incident, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final severityColor = _severityColor(incident.severity);

    return Material(
      color: AppTheme.surfaceContainer,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.outlineVariant),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(7),
                ),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: _SnapshotImage(url: incident.resolvedImageUrl),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            incident.displayType,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  color: AppTheme.onSurface,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ),
                        _SeverityChip(
                          severity: incident.severity,
                          color: severityColor,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      incident.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.onSurfaceVariant,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        _MetaText(
                          icon: Icons.videocam_outlined,
                          text: incident.displayCamera,
                        ),
                        _MetaText(
                          icon: Icons.location_on_outlined,
                          text: incident.displayLocation,
                        ),
                        _MetaText(
                          icon: Icons.access_time,
                          text: _formatDateTime(incident.timestamp),
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
    );
  }
}

class _IncidentDetailsSheet extends StatelessWidget {
  final Incident incident;

  const _IncidentDetailsSheet({required this.incident});

  @override
  Widget build(BuildContext context) {
    final severityColor = _severityColor(incident.severity);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.86,
      minChildSize: 0.5,
      maxChildSize: 0.94,
      builder: (context, scrollController) {
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.outlineVariant,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AspectRatio(
                aspectRatio: 16 / 10,
                child: _SnapshotImage(url: incident.resolvedImageUrl),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: Text(
                    incident.displayType,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppTheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _SeverityChip(
                  severity: incident.severity,
                  color: severityColor,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'ID: ${incident.id}',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppTheme.outline,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 18),
            _DetailBlock(
              label: 'Alert Details',
              icon: Icons.notes,
              child: Text(
                incident.description,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(height: 12),
            _DetailBlock(
              label: 'Camera',
              icon: Icons.videocam_outlined,
              child: Text(
                '${incident.displayCamera} - ${incident.displayLocation}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(height: 12),
            _DetailBlock(
              label: 'Timestamp',
              icon: Icons.schedule,
              child: Text(
                _formatDateTime(incident.timestamp),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.onSurfaceVariant,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SnapshotImage extends StatelessWidget {
  final String? url;

  const _SnapshotImage({required this.url});

  @override
  Widget build(BuildContext context) {
    if (url == null) {
      return const _MissingSnapshot();
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
                const _MissingSnapshot(),
          );
        } catch (_) {
          return const _MissingSnapshot();
        }
      }
    }

    return Image.network(
      url!,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: Colors.black,
          child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        );
      },
      errorBuilder: (context, error, stackTrace) => const _MissingSnapshot(),
    );
  }
}

class _MissingSnapshot extends StatelessWidget {
  const _MissingSnapshot();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.image_not_supported_outlined,
            size: 42,
            color: AppTheme.outline,
          ),
          const SizedBox(height: 8),
          Text(
            'No snapshot available',
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: AppTheme.outline),
          ),
        ],
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String role;

  const _RoleChip({required this.role});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.primaryContainer,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.outlineVariant),
      ),
      child: Text(
        role,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: AppTheme.onSurface,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SeverityChip extends StatelessWidget {
  final String severity;
  final Color color;

  const _SeverityChip({required this.severity, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.36)),
      ),
      child: Text(
        severity,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _MetricTile({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.outlineVariant),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.tertiary, size: 20),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(
                    context,
                  ).textTheme.labelSmall?.copyWith(color: AppTheme.outline),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppTheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaText extends StatelessWidget {
  final IconData icon;
  final String text;

  const _MetaText({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppTheme.outline, size: 15),
        const SizedBox(width: 4),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 210),
          child: Text(
            text,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: AppTheme.onSurfaceVariant),
          ),
        ),
      ],
    );
  }
}

class _DetailBlock extends StatelessWidget {
  final String label;
  final IconData icon;
  final Widget child;

  const _DetailBlock({
    required this.label,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: AppTheme.tertiary),
              const SizedBox(width: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppTheme.tertiary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _StatusPanel extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Color color;

  const _StatusPanel({
    required this.icon,
    required this.title,
    required this.message,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.outlineVariant),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 36),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppTheme.onSurface,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppTheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

Color _severityColor(String severity) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return AppTheme.error;
    case 'HIGH':
      return const Color(0xFFFFC266);
    case 'LOW':
      return AppTheme.tertiary;
    case 'MEDIUM':
    default:
      return AppTheme.primary;
  }
}

String _formatClock(DateTime dateTime) {
  final local = dateTime.toLocal();
  return '${_twoDigits(local.hour)}:${_twoDigits(local.minute)}';
}

String _formatDateTime(DateTime dateTime) {
  final local = dateTime.toLocal();
  return '${local.year}-${_twoDigits(local.month)}-${_twoDigits(local.day)} '
      '${_twoDigits(local.hour)}:${_twoDigits(local.minute)}';
}

String _twoDigits(int value) => value.toString().padLeft(2, '0');
