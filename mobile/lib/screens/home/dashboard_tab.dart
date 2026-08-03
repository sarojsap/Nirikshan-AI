import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../models/incident.dart';
import '../../models/user.dart';
import 'home_screen.dart';

class DashboardTab extends StatelessWidget {
  final User user;
  final List<Incident> incidents;
  final bool isLoading;
  final bool isRefreshing;
  final String? error;
  final DateTime? lastUpdated;
  final VoidCallback onRefresh;
  final VoidCallback onViewAllTap;
  final Function(Incident) onIncidentTap;

  const DashboardTab({
    super.key,
    required this.user,
    required this.incidents,
    required this.isLoading,
    required this.isRefreshing,
    required this.error,
    required this.lastUpdated,
    required this.onRefresh,
    required this.onViewAllTap,
    required this.onIncidentTap,
  });

  @override
  Widget build(BuildContext context) {
    final latestIncidents = incidents.take(5).toList();
    final role = user.role.toUpperCase();

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      color: AppTheme.primary,
      backgroundColor: AppTheme.surface,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // User Greeting Header
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hello, ${user.name}',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: AppTheme.severityLow,
                              shape: BoxShape.circle,
                            ),
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Surveillance System Active',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.severityLow,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // 4 Stat KPI Cards Grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.6,
                    children: [
                      _KpiTile(
                        label: 'Total Incidents',
                        value: incidents.length.toString(),
                        subtitle: 'Recorded log entries',
                        icon: Icons.shield_outlined,
                        accentColor: AppTheme.primary,
                      ),
                      _KpiTile(
                        label: 'Camera Nodes',
                        value: '2 Active',
                        subtitle: 'Office & School feeds',
                        icon: Icons.videocam_outlined,
                        accentColor: AppTheme.secondary,
                      ),
                      _KpiTile(
                        label: 'Threat Level',
                        value: incidents.any((i) => i.severity.toUpperCase() == 'CRITICAL') ? 'ELEVATED' : 'NOMINAL',
                        subtitle: 'Real-time telemetry',
                        icon: Icons.radar_outlined,
                        accentColor: incidents.any((i) => i.severity.toUpperCase() == 'CRITICAL')
                            ? AppTheme.severityCritical
                            : AppTheme.severityLow,
                      ),
                      _KpiTile(
                        label: 'Last Synced',
                        value: lastUpdated == null ? '--:--' : formatClock(lastUpdated!),
                        subtitle: 'Cloud auto-sync',
                        icon: Icons.schedule,
                        accentColor: AppTheme.onSurfaceVariant,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Section Header: Top 5 Recent Feed
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Latest 5 Incidents',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.3,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Top priority real-time events',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppTheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: onViewAllTap,
                        icon: const Icon(Icons.arrow_forward, size: 14, color: AppTheme.primary),
                        label: const Text(
                          'View All',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          if (error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: StatusPanel(
                  icon: Icons.error_outline,
                  title: 'Sync Error',
                  message: error!,
                  color: AppTheme.error,
                ),
              ),
            ),

          if (isLoading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),
            )
          else if (latestIncidents.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: StatusPanel(
                  icon: Icons.verified_user_outlined,
                  title: 'All Clear',
                  message: 'No security threats detected on monitored camera nodes.',
                  color: AppTheme.severityLow,
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              sliver: SliverList.separated(
                itemBuilder: (context, index) {
                  final incident = latestIncidents[index];
                  return IncidentCard(
                    incident: incident,
                    onTap: () => onIncidentTap(incident),
                  );
                },
                separatorBuilder: (context, index) => const SizedBox(height: 14),
                itemCount: latestIncidents.length,
              ),
            ),

          // Footer Shortcut Button to full Incidents tab
          if (incidents.length > 5)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: onViewAllTap,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.primary),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    icon: const Icon(Icons.list_alt_rounded, color: AppTheme.primary, size: 18),
                    label: Text(
                      'View All ${incidents.length} Incidents in Full Feed',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color accentColor;

  const _KpiTile({
    required this.label,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
              Icon(icon, color: accentColor, size: 18),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: accentColor == AppTheme.onSurfaceVariant ? Colors.white : accentColor,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 9,
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
