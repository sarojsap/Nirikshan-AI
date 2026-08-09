import 'dart:ui';
import 'package:flutter/material.dart';

import '../../models/incident.dart';
import 'home_screen.dart';

class IncidentsTab extends StatefulWidget {
  final List<Incident> incidents;
  final bool isLoading;
  final String? error;
  final VoidCallback onRefresh;
  final Function(Incident) onIncidentTap;

  const IncidentsTab({
    super.key,
    required this.incidents,
    required this.isLoading,
    required this.error,
    required this.onRefresh,
    required this.onIncidentTap,
  });

  @override
  State<IncidentsTab> createState() => _IncidentsTabState();
}

class _IncidentsTabState extends State<IncidentsTab> {
  String _dateFilter = 'ALL';
  DateTimeRange? _customDateRange;
  String _severityFilter = 'ALL';
  String _typeFilter = 'ALL';
  String _searchQuery = '';

  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _resetFilters() {
    setState(() {
      _dateFilter = 'ALL';
      _customDateRange = null;
      _severityFilter = 'ALL';
      _typeFilter = 'ALL';
      _searchQuery = '';
      _searchController.clear();
    });
  }

  int get _activeFilterCount {
    int count = 0;
    if (_dateFilter != 'ALL') count++;
    if (_severityFilter != 'ALL') count++;
    if (_typeFilter != 'ALL') count++;
    if (_searchQuery.isNotEmpty) count++;
    return count;
  }

  List<Incident> get _filteredIncidents {
    final now = DateTime.now();

    return widget.incidents.where((incident) {
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchesType = incident.type.toLowerCase().contains(query);
        final matchesDesc =
            incident.description.toLowerCase().contains(query);
        final matchesCamera =
            incident.displayCamera.toLowerCase().contains(query);
        final matchesLocation =
            incident.displayLocation.toLowerCase().contains(query);
        if (!matchesType &&
            !matchesDesc &&
            !matchesCamera &&
            !matchesLocation) {
          return false;
        }
      }

      if (_severityFilter != 'ALL' &&
          incident.severity.toUpperCase() != _severityFilter) {
        return false;
      }

      if (_typeFilter != 'ALL' &&
          !incident.type.toUpperCase().contains(_typeFilter)) {
        return false;
      }

      final timestamp = incident.timestamp.toLocal();
      if (_dateFilter == 'TODAY') {
        final isToday = timestamp.year == now.year &&
            timestamp.month == now.month &&
            timestamp.day == now.day;
        if (!isToday) return false;
      } else if (_dateFilter == 'PAST_7_DAYS') {
        final sevenDaysAgo = now.subtract(const Duration(days: 7));
        if (timestamp.isBefore(sevenDaysAgo)) return false;
      } else if (_dateFilter == 'CUSTOM' && _customDateRange != null) {
        if (timestamp.isBefore(_customDateRange!.start) ||
            timestamp.isAfter(
                _customDateRange!.end.add(const Duration(days: 1)))) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredIncidents;
    final activeCount = _activeFilterCount;

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      color: const Color(0xFF75593F),
      backgroundColor: const Color(0xFFECEEDF),
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          // ─── Header & Search ───
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Incidents',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1D14),
                          letterSpacing: -0.3,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFCFAB8D)
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(9999),
                        ),
                        child: Text(
                          '${filtered.length}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF75593F),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Search bar
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: BackdropFilter(
                            filter:
                                ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                            child: TextField(
                              controller: _searchController,
                              onChanged: (val) =>
                                  setState(() => _searchQuery = val),
                              style: const TextStyle(
                                color: Color(0xFF1A1D14),
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search incidents...',
                                hintStyle: const TextStyle(
                                    color: Color(0xFF9A8E84)),
                                filled: true,
                                fillColor: const Color(0xFFECEEDF)
                                    .withValues(alpha: 0.8),
                                prefixIcon: const Icon(
                                  Icons.search_rounded,
                                  color: Color(0xFF81756C),
                                  size: 20,
                                ),
                                suffixIcon: _searchQuery.isNotEmpty
                                    ? IconButton(
                                        icon: const Icon(Icons.clear,
                                            color: Color(0xFF81756C),
                                            size: 18),
                                        onPressed: () {
                                          _searchController.clear();
                                          setState(
                                              () => _searchQuery = '');
                                        },
                                      )
                                    : null,
                                enabledBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(16),
                                  borderSide: BorderSide(
                                    color: const Color(0xFFD3C4B9)
                                        .withValues(alpha: 0.5),
                                    width: 0.5,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(16),
                                  borderSide: const BorderSide(
                                    color: Color(0xFFCFAB8D),
                                    width: 1.5,
                                  ),
                                ),
                                contentPadding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 12),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Filter button
                      GestureDetector(
                        onTap: _openFilterBottomSheet,
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: activeCount > 0
                                ? const Color(0xFFCFAB8D)
                                : const Color(0xFFECEEDF)
                                    .withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: activeCount > 0
                                  ? const Color(0xFFCFAB8D)
                                  : const Color(0xFFD3C4B9)
                                      .withValues(alpha: 0.5),
                              width: 0.5,
                            ),
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Icon(
                                Icons.tune_rounded,
                                size: 20,
                                color: activeCount > 0
                                    ? const Color(0xFF593F28)
                                    : const Color(0xFF81756C),
                              ),
                              if (activeCount > 0)
                                Positioned(
                                  top: 8,
                                  right: 8,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF593F28),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Quick filter chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        _FilterChip(
                          label: 'All',
                          isSelected: _severityFilter == 'ALL',
                          onTap: () =>
                              setState(() => _severityFilter = 'ALL'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Critical',
                          isSelected: _severityFilter == 'CRITICAL',
                          activeColor: const Color(0xFFBA1A1A),
                          onTap: () => setState(
                              () => _severityFilter = 'CRITICAL'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'High',
                          isSelected: _severityFilter == 'HIGH',
                          activeColor: const Color(0xFFCC5500),
                          onTap: () =>
                              setState(() => _severityFilter = 'HIGH'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Crowd',
                          isSelected: _typeFilter == 'CROWD',
                          onTap: () => setState(() => _typeFilter =
                              _typeFilter == 'CROWD' ? 'ALL' : 'CROWD'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // ─── Loading State ───
          if (widget.isLoading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: CircularProgressIndicator(
                  color: Color(0xFFCFAB8D),
                ),
              ),
            )
          // ─── Empty State ───
          else if (filtered.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: const Color(0xFFECEEDF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.shield_outlined,
                          color: Color(0xFF81756C),
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No incidents found',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1A1D14),
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Try adjusting your search or filters',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF81756C),
                        ),
                      ),
                      if (activeCount > 0) ...[
                        const SizedBox(height: 20),
                        GestureDetector(
                          onTap: _resetFilters,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFCFAB8D),
                              borderRadius: BorderRadius.circular(9999),
                            ),
                            child: const Text(
                              'Reset Filters',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF593F28),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            )
          // ─── Incident List ───
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              sliver: SliverList.separated(
                itemBuilder: (context, index) {
                  final incident = filtered[index];
                  return _IncidentEventCard(
                    incident: incident,
                    onTap: () => widget.onIncidentTap(incident),
                  );
                },
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 14),
                itemCount: filtered.length,
              ),
            ),
        ],
      ),
    );
  }

  void _openFilterBottomSheet() {
    String tempDateFilter = _dateFilter;
    DateTimeRange? tempCustomDateRange = _customDateRange;
    String tempSeverityFilter = _severityFilter;
    String tempTypeFilter = _typeFilter;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF9FBEB),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 36,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Filter Incidents',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1A1D14),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            setSheetState(() {
                              tempDateFilter = 'ALL';
                              tempCustomDateRange = null;
                              tempSeverityFilter = 'ALL';
                              tempTypeFilter = 'ALL';
                            });
                          },
                          child: const Text(
                            'Reset All',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF75593F),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // ─── 1. Date & Timeframe Filter ───
                    const Text(
                      'Date & Timeframe',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF4F453D),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _FilterChip(
                          label: 'All Time',
                          isSelected: tempDateFilter == 'ALL',
                          onTap: () => setSheetState(() => tempDateFilter = 'ALL'),
                        ),
                        _FilterChip(
                          label: 'Today',
                          isSelected: tempDateFilter == 'TODAY',
                          onTap: () => setSheetState(() => tempDateFilter = 'TODAY'),
                        ),
                        _FilterChip(
                          label: 'Past 7 Days',
                          isSelected: tempDateFilter == 'PAST_7_DAYS',
                          onTap: () => setSheetState(() => tempDateFilter = 'PAST_7_DAYS'),
                        ),
                        _FilterChip(
                          label: 'Custom Range',
                          isSelected: tempDateFilter == 'CUSTOM',
                          onTap: () => setSheetState(() => tempDateFilter = 'CUSTOM'),
                        ),
                      ],
                    ),

                    if (tempDateFilter == 'CUSTOM') ...[
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: () async {
                          final picked = await showDateRangePicker(
                            context: context,
                            firstDate: DateTime(2020),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                            initialDateRange: tempCustomDateRange ??
                                DateTimeRange(
                                  start: DateTime.now().subtract(const Duration(days: 7)),
                                  end: DateTime.now(),
                                ),
                            builder: (context, child) {
                              return Theme(
                                data: Theme.of(context).copyWith(
                                  colorScheme: const ColorScheme.light(
                                    primary: Color(0xFF75593F),
                                    onPrimary: Colors.white,
                                    surface: Color(0xFFF9FBEB),
                                    onSurface: Color(0xFF1A1D14),
                                  ),
                                ),
                                child: child!,
                              );
                            },
                          );
                          if (picked != null) {
                            setSheetState(() => tempCustomDateRange = picked);
                          }
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECEEDF).withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: const Color(0xFFCFAB8D).withValues(alpha: 0.5),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 18, color: Color(0xFF75593F)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  tempCustomDateRange == null
                                      ? 'Select Date Range'
                                      : '${tempCustomDateRange!.start.toString().split(' ')[0]}  →  ${tempCustomDateRange!.end.toString().split(' ')[0]}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1A1D14),
                                  ),
                                ),
                              ),
                              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF81756C)),
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // ─── 2. Severity Level Filter ───
                    const Text(
                      'Severity Level',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF4F453D),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _FilterChip(
                          label: 'All Severities',
                          isSelected: tempSeverityFilter == 'ALL',
                          onTap: () => setSheetState(() => tempSeverityFilter = 'ALL'),
                        ),
                        _FilterChip(
                          label: 'Critical',
                          isSelected: tempSeverityFilter == 'CRITICAL',
                          activeColor: const Color(0xFFBA1A1A),
                          onTap: () => setSheetState(() => tempSeverityFilter = 'CRITICAL'),
                        ),
                        _FilterChip(
                          label: 'High',
                          isSelected: tempSeverityFilter == 'HIGH',
                          activeColor: const Color(0xFFCC5500),
                          onTap: () => setSheetState(() => tempSeverityFilter = 'HIGH'),
                        ),
                        _FilterChip(
                          label: 'Medium',
                          isSelected: tempSeverityFilter == 'MEDIUM',
                          activeColor: const Color(0xFFD9822B),
                          onTap: () => setSheetState(() => tempSeverityFilter = 'MEDIUM'),
                        ),
                        _FilterChip(
                          label: 'Low',
                          isSelected: tempSeverityFilter == 'LOW',
                          activeColor: const Color(0xFF2E7D5B),
                          onTap: () => setSheetState(() => tempSeverityFilter = 'LOW'),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // ─── 3. Incident Type Filter ───
                    const Text(
                      'Incident Type',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF4F453D),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _FilterChip(
                          label: 'All Types',
                          isSelected: tempTypeFilter == 'ALL',
                          onTap: () => setSheetState(() => tempTypeFilter = 'ALL'),
                        ),
                        _FilterChip(
                          label: 'Intrusion',
                          isSelected: tempTypeFilter == 'INTRUSION',
                          onTap: () => setSheetState(() => tempTypeFilter = 'INTRUSION'),
                        ),
                        _FilterChip(
                          label: 'Crowd Detection',
                          isSelected: tempTypeFilter == 'CROWD',
                          onTap: () => setSheetState(() => tempTypeFilter = 'CROWD'),
                        ),
                        _FilterChip(
                          label: 'Person Detected',
                          isSelected: tempTypeFilter == 'PERSON_DETECTED',
                          onTap: () => setSheetState(() => tempTypeFilter = 'PERSON_DETECTED'),
                        ),
                        _FilterChip(
                          label: 'Restricted Area',
                          isSelected: tempTypeFilter == 'RESTRICTED_AREA',
                          onTap: () => setSheetState(() => tempTypeFilter = 'RESTRICTED_AREA'),
                        ),
                      ],
                    ),

                    const SizedBox(height: 28),

                    // ─── Apply Button ───
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _dateFilter = tempDateFilter;
                            _customDateRange = tempCustomDateRange;
                            _severityFilter = tempSeverityFilter;
                            _typeFilter = tempTypeFilter;
                          });
                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFCFAB8D),
                          foregroundColor: const Color(0xFF593F28),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text(
                          'Apply Filters',
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
          },
        );
      },
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color? activeColor;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = activeColor ?? const Color(0xFF75593F);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.12)
              : const Color(0xFFECEEDF).withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(9999),
          border: Border.all(
            color: isSelected
                ? color.withValues(alpha: 0.3)
                : const Color(0xFFD3C4B9).withValues(alpha: 0.5),
            width: isSelected ? 1.0 : 0.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? color : const Color(0xFF81756C),
          ),
        ),
      ),
    );
  }
}

class _IncidentEventCard extends StatelessWidget {
  final Incident incident;
  final VoidCallback onTap;

  const _IncidentEventCard({
    required this.incident,
    required this.onTap,
  });

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
                  // Image
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(23)),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child:
                          SnapshotImage(url: incident.resolvedImageUrl),
                    ),
                  ),
                  // Content
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
                            const SizedBox(width: 10),
                            Expanded(
                              child: MetaText(
                                icon: Icons.location_on_outlined,
                                text: incident.displayLocation,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        MetaText(
                          icon: Icons.schedule_outlined,
                          text: formatDateTime(incident.timestamp),
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
