import 'package:flutter/material.dart';

import '../../config/theme.dart';
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
  String _dateFilter = 'ALL'; // ALL, TODAY, PAST_7_DAYS, CUSTOM
  DateTimeRange? _customDateRange;
  String _severityFilter = 'ALL'; // ALL, CRITICAL, HIGH, MEDIUM, LOW
  String _typeFilter = 'ALL'; // ALL, CROWD, INTRUSION, SMOKE
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
      // 1. Search Query Filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchesType = incident.type.toLowerCase().contains(query);
        final matchesDesc = incident.description.toLowerCase().contains(query);
        final matchesCamera = incident.displayCamera.toLowerCase().contains(query);
        final matchesLocation = incident.displayLocation.toLowerCase().contains(query);
        if (!matchesType && !matchesDesc && !matchesCamera && !matchesLocation) {
          return false;
        }
      }

      // 2. Severity Filter
      if (_severityFilter != 'ALL' && incident.severity.toUpperCase() != _severityFilter) {
        return false;
      }

      // 3. Type Filter
      if (_typeFilter != 'ALL' && !incident.type.toUpperCase().contains(_typeFilter)) {
        return false;
      }

      // 4. Date Range Filter
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
            timestamp.isAfter(_customDateRange!.end.add(const Duration(days: 1)))) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  Future<void> _pickCustomDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2025, 1, 1),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _customDateRange ??
          DateTimeRange(
            start: DateTime.now().subtract(const Duration(days: 3)),
            end: DateTime.now(),
          ),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              surface: AppTheme.surface,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _dateFilter = 'CUSTOM';
        _customDateRange = picked;
      });
    }
  }

  void _openFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final tempFilteredCount = _filteredIncidents.length;

            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.78,
              minChildSize: 0.4,
              maxChildSize: 0.90,
              builder: (context, scrollController) {
                return ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppTheme.outlineVariant,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Sheet Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.tune_rounded, color: AppTheme.primary, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Filter Security Logs',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        if (_activeFilterCount > 0)
                          TextButton(
                            onPressed: () {
                              _resetFilters();
                              setSheetState(() {});
                            },
                            child: const Text(
                              'Clear All',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.error,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 1. Date Range Section
                    const _FilterSectionTitle(title: 'DATE RANGE'),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _ChoicePill(
                          label: 'All Time',
                          isSelected: _dateFilter == 'ALL',
                          onTap: () {
                            setState(() => _dateFilter = 'ALL');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'Today',
                          isSelected: _dateFilter == 'TODAY',
                          onTap: () {
                            setState(() => _dateFilter = 'TODAY');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'Past 7 Days',
                          isSelected: _dateFilter == 'PAST_7_DAYS',
                          onTap: () {
                            setState(() => _dateFilter = 'PAST_7_DAYS');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: _customDateRange != null
                              ? '${_customDateRange!.start.month}/${_customDateRange!.start.day} - ${_customDateRange!.end.month}/${_customDateRange!.end.day}'
                              : 'Custom Range...',
                          isSelected: _dateFilter == 'CUSTOM',
                          onTap: () async {
                            await _pickCustomDateRange();
                            setSheetState(() {});
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 2. Severity Section
                    const _FilterSectionTitle(title: 'SEVERITY LEVEL'),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _ChoicePill(
                          label: 'All Severities',
                          isSelected: _severityFilter == 'ALL',
                          onTap: () {
                            setState(() => _severityFilter = 'ALL');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'CRITICAL',
                          activeColor: AppTheme.severityCritical,
                          isSelected: _severityFilter == 'CRITICAL',
                          onTap: () {
                            setState(() => _severityFilter = 'CRITICAL');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'HIGH',
                          activeColor: AppTheme.severityHigh,
                          isSelected: _severityFilter == 'HIGH',
                          onTap: () {
                            setState(() => _severityFilter = 'HIGH');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'MEDIUM',
                          activeColor: AppTheme.severityMedium,
                          isSelected: _severityFilter == 'MEDIUM',
                          onTap: () {
                            setState(() => _severityFilter = 'MEDIUM');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'LOW',
                          activeColor: AppTheme.severityLow,
                          isSelected: _severityFilter == 'LOW',
                          onTap: () {
                            setState(() => _severityFilter = 'LOW');
                            setSheetState(() {});
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 3. Alert Type Section
                    const _FilterSectionTitle(title: 'ALERT TYPE'),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _ChoicePill(
                          label: 'All Types',
                          isSelected: _typeFilter == 'ALL',
                          onTap: () {
                            setState(() => _typeFilter = 'ALL');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'CROWD',
                          isSelected: _typeFilter == 'CROWD',
                          onTap: () {
                            setState(() => _typeFilter = 'CROWD');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'INTRUSION',
                          isSelected: _typeFilter == 'INTRUSION',
                          onTap: () {
                            setState(() => _typeFilter = 'INTRUSION');
                            setSheetState(() {});
                          },
                        ),
                        _ChoicePill(
                          label: 'SMOKE',
                          isSelected: _typeFilter == 'SMOKE',
                          onTap: () {
                            setState(() => _typeFilter = 'SMOKE');
                            setSheetState(() {});
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // Apply Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.check_circle_outline, size: 20),
                        label: Text(
                          'Show $tempFilteredCount Filtered Events',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredIncidents;
    final activeCount = _activeFilterCount;

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      color: AppTheme.primary,
      backgroundColor: AppTheme.surface,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title Header
                  const Text(
                    'Incident Management',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Filter & investigate security log history',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Search Bar + Material 3 Filter Action Button Row
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: (val) => setState(() => _searchQuery = val),
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'Search camera or threat...',
                            prefixIcon: const Icon(Icons.search, color: AppTheme.primary, size: 20),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, color: AppTheme.onSurfaceVariant, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Material 3 Filter Button with Badge
                      GestureDetector(
                        onTap: _openFilterBottomSheet,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                          decoration: BoxDecoration(
                            color: activeCount > 0 ? AppTheme.primary : AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: activeCount > 0 ? AppTheme.primary : AppTheme.outline,
                            ),
                            boxShadow: activeCount > 0
                                ? [
                                    BoxShadow(
                                      color: AppTheme.primary.withOpacity(0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.tune_rounded,
                                size: 18,
                                color: activeCount > 0 ? Colors.white : AppTheme.primary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Filter',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: activeCount > 0 ? Colors.white : AppTheme.primary,
                                ),
                              ),
                              if (activeCount > 0) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.all(5),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    activeCount.toString(),
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: AppTheme.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Active Filter Summary Pills Row (if filters are active)
                  if (activeCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.filter_alt, size: 14, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  if (_dateFilter != 'ALL')
                                    _ActivePillTag(text: 'Date: $_dateFilter'),
                                  if (_severityFilter != 'ALL')
                                    _ActivePillTag(text: 'Severity: $_severityFilter'),
                                  if (_typeFilter != 'ALL')
                                    _ActivePillTag(text: 'Type: $_typeFilter'),
                                  if (_searchQuery.isNotEmpty)
                                    _ActivePillTag(text: 'Search: "$_searchQuery"'),
                                ],
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: _resetFilters,
                            child: const Padding(
                              padding: EdgeInsets.only(left: 6),
                              child: Icon(Icons.close, size: 16, color: AppTheme.error),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 12),

                  // Counter Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Showing ${filtered.length} of ${widget.incidents.length} Events',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          if (widget.error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: StatusPanel(
                  icon: Icons.error_outline,
                  title: 'Sync Error',
                  message: widget.error!,
                  color: AppTheme.error,
                ),
              ),
            ),

          if (widget.isLoading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: StatusPanel(
                  icon: Icons.filter_alt_off_outlined,
                  title: 'No Matching Events',
                  message: activeCount > 0
                      ? 'No security incidents match your current filter settings.'
                      : 'No security threats detected on camera nodes.',
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
              sliver: SliverList.separated(
                itemBuilder: (context, index) {
                  final incident = filtered[index];
                  return IncidentCard(
                    incident: incident,
                    onTap: () => widget.onIncidentTap(incident),
                  );
                },
                separatorBuilder: (context, index) => const SizedBox(height: 14),
                itemCount: filtered.length,
              ),
            ),
        ],
      ),
    );
  }
}

class _FilterSectionTitle extends StatelessWidget {
  final String title;

  const _FilterSectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: AppTheme.primary,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _ChoicePill extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color activeColor;
  final VoidCallback onTap;

  const _ChoicePill({
    required this.label,
    required this.isSelected,
    this.activeColor = AppTheme.primary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : const Color(0xFF090F19),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? activeColor : AppTheme.outline,
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : AppTheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _ActivePillTag extends StatelessWidget {
  final String text;

  const _ActivePillTag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: AppTheme.primary,
        ),
      ),
    );
  }
}
