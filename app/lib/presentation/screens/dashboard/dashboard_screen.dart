import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../cubits/dashboard/dashboard_cubit.dart';
import '../../cubits/auth/auth_cubit.dart';
import '../../cubits/soldiers/soldiers_cubit.dart';
import '../../cubits/exams/exams_cubit.dart';
import '../../cubits/results/results_cubit.dart';
import '../../cubits/fitness/fitness_cubit.dart';
import '../../cubits/announcements/announcements_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/models/dashboard_stats_model.dart';
import '../../widgets/score_badge.dart';
import '../soldiers/soldiers_screen.dart';
import '../exams/exams_screen.dart';
import '../results/results_screen.dart';
import '../fitness/fitness_screen.dart';
import '../announcements/announcements_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    context.read<DashboardCubit>().loadStats();
  }

  @override
  Widget build(BuildContext context) {
    final api = context.read<ApiService>();
    final screens = [
      _buildDashboard(context),
      BlocProvider(create: (_) => SoldiersCubit(api)..loadSoldiers(), child: const SoldiersScreen()),
      BlocProvider(create: (_) => ExamsCubit(api)..loadExams(), child: const ExamsScreen()),
      BlocProvider(create: (_) => ResultsCubit(api)..loadResults(), child: const ResultsScreen()),
      BlocProvider(create: (_) => FitnessCubit(api)..loadExercises(), child: const FitnessScreen()),
      BlocProvider(create: (_) => AnnouncementsCubit(api)..loadAnnouncements(), child: const AnnouncementsScreen()),
    ];

    final titles = ['Dashboard', 'Soldiers', 'Exams', 'Results', 'Fitness', 'Announcements'];
    final icons = [
      Icons.dashboard, Icons.people, Icons.assignment, Icons.grading, Icons.fitness_center, Icons.campaign,
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_currentIndex]),
        actions: [
          BlocBuilder<AuthCubit, AuthState>(
            builder: (ctx, state) {
              if (state is AuthAuthenticated) {
                return PopupMenuButton<String>(
                  icon: const Icon(Icons.account_circle),
                  onSelected: (v) {
                    if (v == 'logout') context.read<AuthCubit>().logout();
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(value: 'info', enabled: false,
                      child: Text('${state.user.name} (${state.user.role})'),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'logout', child: Text('Logout')),
                  ],
                );
              }
              return const SizedBox();
            },
          ),
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() {
          _currentIndex = i;
          if (i == 0) context.read<DashboardCubit>().loadStats();
        }),
        backgroundColor: const Color(AC.card),
        indicatorColor: const Color(AC.gold).withOpacity(0.2),
        destinations: List.generate(titles.length, (i) => NavigationDestination(
          icon: Icon(icons[i], color: const Color(AC.textSecondary)),
          selectedIcon: Icon(icons[i], color: const Color(AC.gold)),
          label: titles[i],
        )),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context) {
    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (ctx, state) {
        if (state is DashboardLoading) {
          return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
        }
        if (state is DashboardError) {
          return Center(child: Text(state.message, style: const TextStyle(color: Color(AC.danger))));
        }
        if (state is! DashboardLoaded) return const SizedBox();
        final stats = state.stats;
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSummaryRow(stats),
              const SizedBox(height: 16),
              _buildDistributionChart(stats.distribution),
              const SizedBox(height: 16),
              _buildWeaponStats(stats.byWeapon),
              const SizedBox(height: 16),
              _buildRecentResults(stats.recentResults),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSummaryRow(DashboardStats stats) {
    return Row(
      children: [
        _summaryCard('Soldiers', stats.totalSoldiers.toString(), Icons.people, const Color(AC.gold)),
        const SizedBox(width: 8),
        _summaryCard('Results', stats.totalResults.toString(), Icons.grading, const Color(AC.success)),
        const SizedBox(width: 8),
        _summaryCard('Average', '${stats.avgScore}%', Icons.trending_up, Colors.cyan),
        const SizedBox(width: 8),
        _summaryCard('Pass Rate', '${stats.passRate}%', Icons.check_circle, Colors.green),
      ],
    );
  }

  Widget _summaryCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: const TextStyle(fontSize: 11, color: Color(AC.textSecondary))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDistributionChart(ScoreDistribution dist) {
    final data = [
      _ChartData('Excellent', dist.excellent.toDouble(), const Color(0xFF1B8A2E)),
      _ChartData('Very Good', dist.veryGood.toDouble(), const Color(0xFF2D6A4F)),
      _ChartData('Good', dist.good.toDouble(), const Color(AC.gold)),
      _ChartData('Acceptable', dist.acceptable.toDouble(), const Color(AC.warning)),
      _ChartData('Fail', dist.fail.toDouble(), const Color(AC.danger)),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Score Distribution', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: data.map((d) => PieChartSectionData(
                    value: d.value,
                    title: d.value > 0 ? '${d.value.toInt()}' : '',
                    color: d.color,
                    radius: 60,
                    titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                  )).toList(),
                  centerSpaceRadius: 40,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: data.map((d) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 12, height: 12, decoration: BoxDecoration(
                    color: d.color, shape: BoxShape.circle,
                  )),
                  const SizedBox(width: 4),
                  Text(d.label, style: const TextStyle(fontSize: 12, color: Color(AC.textSecondary))),
                ],
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeaponStats(List<WeaponStat> byWeapon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('By Weapon', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...byWeapon.map((w) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Text(w.weaponIcon, style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(w.weaponName, style: const TextStyle(color: Color(AC.textPrimary)))),
                  Text('${w.count} soldiers', style: const TextStyle(color: Color(AC.textSecondary), fontSize: 12)),
                  const SizedBox(width: 12),
                  ScoreBadge(score: w.avg, fontSize: 12),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentResults(List<RecentResult> recent) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Recent Results', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...recent.map((r) => ListTile(
              dense: true,
              title: Text(r.soldierName, style: const TextStyle(color: Color(AC.textPrimary), fontSize: 14)),
              subtitle: Text(r.examTitle ?? '', style: const TextStyle(fontSize: 12)),
              trailing: ScoreBadge(score: r.totalScore),
            )),
          ],
        ),
      ),
    );
  }
}

class _ChartData {
  final String label;
  final double value;
  final Color color;
  _ChartData(this.label, this.value, this.color);
}
