import 'dart:ui';
import 'package:flutter/material.dart';

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

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      color: const Color(0xFF75593F),
      backgroundColor: const Color(0xFFECEEDF),
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ─── Greeting & Identity ───
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome back,',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: const Color(0xFF4F453D),
                              ),
                            ),
                            Text(
                              user.name,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1A1D14),
                                letterSpacing: -0.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Status indicator
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECEEDF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFD3C4B9),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: Color(0xFF2E7D5B),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Online',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF2E7D5B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),



                  // ─── Metrics Row ───
                  Row(
                    children: [
                      Expanded(
                        child: _MetricCard(
                          label: 'Incidents',
                          value: incidents.length.toString(),
                          icon: Icons.shield_outlined,
                          color: const Color(0xFF75593F),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _MetricCard(
                          label: 'Cameras',
                          value: '2',
                          icon: Icons.videocam_outlined,
                          color: const Color(0xFF44636B),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _MetricCard(
                          label: 'Synced',
                          value: lastUpdated == null
                              ? '--:--'
                              : formatClock(lastUpdated!),
                          icon: Icons.sync_outlined,
                          color: const Color(0xFF6B5C4B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // ─── Recent Incidents Header ───
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Events',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1D14),
                          letterSpacing: -0.2,
                        ),
                      ),
                      GestureDetector(
                        onTap: onViewAllTap,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 7),
                          decoration: BoxDecoration(
                            color: const Color(0xFFCFAB8D)
                                .withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(9999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Text(
                                'View All',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF75593F),
                                ),
                              ),
                              SizedBox(width: 4),
                              Icon(Icons.arrow_forward_rounded,
                                  size: 14, color: Color(0xFF75593F)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                ],
              ),
            ),
          ),

          // ─── Error State ───
          if (error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                child: StatusPanel(
                  icon: Icons.error_outline,
                  title: 'Connection Error',
                  message: error!,
                  color: const Color(0xFFBA1A1A),
                ),
              ),
            ),

          // ─── Loading State ───
          if (isLoading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: CircularProgressIndicator(
                  color: Color(0xFFCFAB8D),
                ),
              ),
            )
          // ─── Empty State ───
          else if (latestIncidents.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: StatusPanel(
                  icon: Icons.verified_user_outlined,
                  title: 'All Clear',
                  message:
                      'No security events detected across monitored feeds.',
                  color: const Color(0xFF2E7D5B),
                ),
              ),
            )
          // ─── Incident List ───
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              sliver: SliverList.separated(
                itemBuilder: (context, index) {
                  final incident = latestIncidents[index];
                  return IncidentCard(
                    incident: incident,
                    onTap: () => onIncidentTap(incident),
                  );
                },
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 14),
                itemCount: latestIncidents.length,
              ),
            ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFECEEDF).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(20),
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 10),
              Text(
                value,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1A1D14),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF81756C),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
