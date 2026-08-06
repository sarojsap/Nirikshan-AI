import 'dart:ui';
import 'package:flutter/material.dart';

import '../../config/constants.dart';
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
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
          children: [
            // ─── Page Title ───
            const Text(
              'Settings',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1D14),
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 24),

            // ─── Profile Card ───
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECEEDF).withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: const Color(0xFFCFAB8D).withValues(alpha: 0.25),
                      width: 0.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF75593F).withValues(alpha: 0.05),
                        blurRadius: 30,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Avatar
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCFAB8D),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Center(
                          child: Text(
                            widget.user.name.isNotEmpty
                                ? widget.user.name[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF593F28),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.user.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1A1D14),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.user.email,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF81756C),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Role badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFCFAB8D).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(9999),
                        ),
                        child: Text(
                          widget.user.role.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF75593F),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),

            // ─── Preferences Section ───
            _sectionLabel('PREFERENCES'),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFECEEDF).withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFFD3C4B9).withValues(alpha: 0.4),
                      width: 0.5,
                    ),
                  ),
                  child: SwitchListTile(
                    activeTrackColor: const Color(0xFFCFAB8D),
                    activeThumbColor: Colors.white,
                    inactiveTrackColor: const Color(0xFFD9DBCD),
                    inactiveThumbColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 4),
                    title: const Text(
                      'Push Notifications',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1A1D14),
                      ),
                    ),
                    subtitle: const Text(
                      'Alerts for critical security events',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF81756C),
                      ),
                    ),
                    value: _pushNotificationsEnabled,
                    onChanged: (val) =>
                        setState(() => _pushNotificationsEnabled = val),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),

            // ─── Infrastructure Section ───
            _sectionLabel('INFRASTRUCTURE'),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFECEEDF).withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFFD3C4B9).withValues(alpha: 0.4),
                      width: 0.5,
                    ),
                  ),
                  child: Column(
                    children: [
                      _InfoTile(
                        icon: Icons.cloud_outlined,
                        title: 'Cloud Backend',
                        value: 'AWS EC2',
                        subtitle: apiOrigin,
                      ),
                      Divider(
                        height: 1,
                        indent: 60,
                        color: const Color(0xFFD3C4B9).withValues(alpha: 0.5),
                      ),
                      const _InfoTile(
                        icon: Icons.lock_outline_rounded,
                        title: 'Encryption',
                        value: 'TLS / WSS',
                        subtitle: 'End-to-end secure communication',
                      ),
                      Divider(
                        height: 1,
                        indent: 60,
                        color: const Color(0xFFD3C4B9).withValues(alpha: 0.5),
                      ),
                      const _InfoTile(
                        icon: Icons.memory_outlined,
                        title: 'AI Engine',
                        value: 'YOLO v2.4',
                        subtitle: 'Real-time object & anomaly detection',
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 36),

            // ─── Sign Out ───
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: widget.onLogout,
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      const Color(0xFFBA1A1A).withValues(alpha: 0.08),
                  foregroundColor: const Color(0xFFBA1A1A),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: const Color(0xFFBA1A1A).withValues(alpha: 0.2),
                      width: 0.5,
                    ),
                  ),
                ),
                child: const Text(
                  'Sign Out',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: Color(0xFF81756C),
        letterSpacing: 1.5,
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String subtitle;

  const _InfoTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFCFAB8D).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: const Color(0xFF75593F), size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1D14),
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF81756C),
                  ),
                ),
              ],
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF75593F),
            ),
          ),
        ],
      ),
    );
  }
}
