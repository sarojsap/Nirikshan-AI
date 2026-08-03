import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/user.dart';

class SettingsTab extends StatefulWidget {
  final User user;
  final VoidCallback onLogout;

  const SettingsTab({
    super.key,
    required this.user,
    required this.onLogout,
  });

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  bool _pushNotificationsEnabled = true;

  @override
  Widget build(BuildContext context) {
    final role = widget.user.role.toUpperCase();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            // Title
            const Text(
              'Settings & Controls',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 2),
            const Text(
              'Manage application preferences & device connections',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),

            // Profile Card Container
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.outline),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                    ),
                    child: const Center(
                      child: Icon(Icons.person_outline, color: AppTheme.primary, size: 28),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.user.name,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.user.email,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                          ),
                          child: Text(
                            role,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Section 1: Notifications & Telemetry
            const _SectionHeader(title: 'PREFERENCES & NOTIFICATIONS'),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.outline),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    activeColor: AppTheme.primary,
                    title: const Text('Push Notifications', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                    subtitle: const Text('Real-time alerts for critical security events', style: TextStyle(fontSize: 11, color: AppTheme.onSurfaceVariant)),
                    value: _pushNotificationsEnabled,
                    onChanged: (val) => setState(() => _pushNotificationsEnabled = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Section 2: Infrastructure & Backend Target
            const _SectionHeader(title: 'CLOUD INFRASTRUCTURE'),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.outline),
              ),
              child: Column(
                children: const [
                  _SettingTile(
                    icon: Icons.cloud_done_outlined,
                    title: 'Cloud Backend Origin',
                    value: 'Railway Production Cloud',
                    subtitle: apiOrigin,
                  ),
                  Divider(height: 1, color: AppTheme.outline),
                  _SettingTile(
                    icon: Icons.security_outlined,
                    title: 'TLS / SSL Security',
                    value: 'Encrypted HTTPS / WSS',
                    subtitle: 'Secure end-to-end communication',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Section 3: App Information
            const _SectionHeader(title: 'SYSTEM INFORMATION'),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.outline),
              ),
              child: Column(
                children: const [
                  _SettingTile(
                    icon: Icons.info_outline,
                    title: 'Application Version',
                    value: 'v1.0.0 (Build 1)',
                    subtitle: 'Nirikshan AI Surveillance System',
                  ),
                  Divider(height: 1, color: AppTheme.outline),
                  _SettingTile(
                    icon: Icons.memory_outlined,
                    title: 'YOLO Detection Engine',
                    value: 'Edge AI v2.4 (Ultra-Low Latency)',
                    subtitle: 'Real-time object & anomaly detection',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Logout Action Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: widget.onLogout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.error.withOpacity(0.15),
                  foregroundColor: AppTheme.error,
                  side: const BorderSide(color: AppTheme.error, width: 1),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text(
                  'Sign Out of Command Center',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w800,
        color: AppTheme.onSurfaceVariant,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String subtitle;

  const _SettingTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppTheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppTheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
