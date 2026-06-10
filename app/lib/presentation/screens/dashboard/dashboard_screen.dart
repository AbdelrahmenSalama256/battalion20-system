import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/dashboard/dashboard_cubit.dart';
import '../../cubits/auth/auth_cubit.dart';
import '../../cubits/soldiers/soldiers_cubit.dart';
import '../../cubits/exams/exams_cubit.dart';
import '../../cubits/results/results_cubit.dart';
import '../../cubits/announcements/announcements_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/dashboard_stats_model.dart';
import '../../widgets/score_badge.dart';
import '../../widgets/toast_helper.dart';
import '../../widgets/app_drawer.dart';
import '../soldiers/soldiers_screen.dart';
import '../exams/exams_screen.dart';
import '../results/results_screen.dart';
import '../announcements/announcements_screen.dart';
import '../settings/settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  Timer? _notifTimer;
  int _prevNotifCount = 0;

  final _tabs = [
    _TabItem('الرئيسية', Icons.dashboard_outlined, Icons.dashboard),
    _TabItem('الأفراد', Icons.people_outline, Icons.people),
    _TabItem('الامتحانات', Icons.assignment_outlined, Icons.assignment),
    _TabItem('النتائج', Icons.grading_outlined, Icons.grading),
    _TabItem('الإعلانات', Icons.campaign_outlined, Icons.campaign),
    _TabItem('الإعدادات', Icons.settings_outlined, Icons.settings),
  ];

  @override
  void initState() {
    super.initState();
    context.read<DashboardCubit>().loadStats();
    _startNotifPolling();
  }

  @override
  void dispose() {
    _notifTimer?.cancel();
    super.dispose();
  }

  void _startNotifPolling() {
    _notifTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      if (!mounted) return;
      try {
        final repo = ApiRepository(context.read<ApiService>());
        final notifs = await repo.getNotifications();
        if (notifs.length > _prevNotifCount && _prevNotifCount > 0) {
          final latest = notifs.first;
          final msg = latest['message'] ?? 'لديك إشعار جديد';
          if (mounted) {
            showToast(context, '🔔 $msg', isSuccess: true);
            // Deep link: if notification has evaluated_id, ask to navigate
            if (latest['evaluated_id'] != null) {
              ScaffoldMessenger.of(context).clearSnackBars();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('🔔 $msg', style: TextStyle(fontSize: 14.sp)),
                  backgroundColor: const Color(AC.gold),
                  behavior: SnackBarBehavior.floating,
                  duration: const Duration(seconds: 5),
                  action: SnackBarAction(
                    label: 'عرض',
                    textColor: Colors.black,
                    onPressed: () => setState(() => _currentIndex = 1),
                  ),
                ),
              );
            }
          }
        }
        _prevNotifCount = notifs.length;
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    final api = context.read<ApiService>();
    final screens = [
      _buildDashboard(),
      BlocProvider(create: (_) => SoldiersCubit(api)..loadSoldiers(), child: const SoldiersScreen()),
      BlocProvider(create: (_) => ExamsCubit(api)..loadExams(), child: const ExamsScreen()),
      BlocProvider(create: (_) => ResultsCubit(api)..loadResults(), child: const ResultsScreen()),
      BlocProvider(create: (_) => AnnouncementsCubit(api)..loadAnnouncements(), child: const AnnouncementsScreen()),
      const SettingsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(_tabs[_currentIndex].label, style: TextStyle(fontSize: 18.sp)),
        centerTitle: true,
        actions: [
          BlocBuilder<AuthCubit, AuthState>(
            builder: (ctx, state) {
              if (state is AuthAuthenticated) {
                return Padding(
                  padding: EdgeInsets.only(left: 8.w),
                  child: GestureDetector(
                    onTap: () => Scaffold.of(context).openEndDrawer(),
                    child: CircleAvatar(
                      radius: 18.r,
                      backgroundColor: const Color(AC.gold).withOpacity(0.2),
                      child: Text(
                        state.user.name.isNotEmpty ? state.user.name[0].toUpperCase() : '?',
                        style: TextStyle(
                          color: const Color(AC.gold),
                          fontWeight: FontWeight.bold,
                          fontSize: 16.sp,
                        ),
                      ),
                    ),
                  ),
                );
              }
              return const SizedBox();
            },
          ),
        ],
      ),
      endDrawer: const AppDrawer(),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: const Color(AC.cardBorder), width: 0.5)),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (i) {
            setState(() => _currentIndex = i);
            if (i == 0) context.read<DashboardCubit>().loadStats();
          },
          backgroundColor: const Color(AC.card),
          indicatorColor: const Color(AC.gold).withOpacity(0.15),
          height: 70.h,
          labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
          destinations: _tabs.map((t) => NavigationDestination(
            icon: Icon(t.icon, color: const Color(AC.textSecondary), size: 22.r),
            selectedIcon: Icon(t.selectedIcon, color: const Color(AC.gold), size: 22.r),
            label: t.label,
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildDashboard() {
    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (ctx, state) {
        if (state is DashboardLoading) {
          return Center(child: CircularProgressIndicator(color: const Color(AC.gold)));
        }
        if (state is DashboardError) {
          return _buildError('فشل تحميل البيانات', () => context.read<DashboardCubit>().loadStats());
        }
        if (state is! DashboardLoaded) return const SizedBox();
        final stats = state.stats;
        return RefreshIndicator(
          color: const Color(AC.gold),
          onRefresh: () => context.read<DashboardCubit>().loadStats(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.all(16.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSummaryGrid(stats),
                SizedBox(height: 16.h),
                _buildDistributionCard(stats.distribution),
                SizedBox(height: 16.h),
                _buildWeaponCard(stats.byWeapon),
                SizedBox(height: 16.h),
                _buildRecentCard(stats.recentResults),
                SizedBox(height: 24.h),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildError(String msg, VoidCallback onRetry) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(32.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, size: 64.r, color: const Color(AC.textSecondary)),
            SizedBox(height: 16.h),
            Text(msg, style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary)), textAlign: TextAlign.center),
            SizedBox(height: 24.h),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryGrid(DashboardStats stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10.h,
      crossAxisSpacing: 10.w,
      childAspectRatio: 1.6,
      children: [
        _summaryCard('الأفراد', stats.totalSoldiers.toString(), Icons.people_outline, const Color(AC.gold)),
        _summaryCard('النتائج', stats.totalResults.toString(), Icons.grading_outlined, const Color(AC.success)),
        _summaryCard('المعدل', '${stats.avgScore}%', Icons.trending_up, const Color(0xFF4FC3F7)),
        _summaryCard('النجاح', '${stats.passRate}%', Icons.check_circle_outline, const Color(0xFF66BB6A)),
      ],
    );
  }

  Widget _summaryCard(String label, String value, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(AC.card),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(AC.cardBorder)),
      ),
      padding: EdgeInsets.all(14.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 22.r),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6.r),
                ),
                child: Text(value, style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: color)),
              ),
            ],
          ),
          SizedBox(height: 4.h),
          Text(label, style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary))),
        ],
      ),
    );
  }

  Widget _buildDistributionCard(ScoreDistribution dist) {
    final total = dist.excellent + dist.veryGood + dist.good + dist.acceptable + dist.fail;
    final items = [
      _DistItem('ممتاز', dist.excellent, total, const Color(0xFF1B8A2E)),
      _DistItem('جيد جداً', dist.veryGood, total, const Color(0xFF2D6A4F)),
      _DistItem('جيد', dist.good, total, const Color(AC.gold)),
      _DistItem('مقبول', dist.acceptable, total, const Color(AC.warning)),
      _DistItem('راسب', dist.fail, total, const Color(AC.danger)),
    ];
    return Container(
      decoration: BoxDecoration(
        color: const Color(AC.card),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(AC.cardBorder)),
      ),
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.pie_chart_outline, color: const Color(AC.gold), size: 18.r),
              SizedBox(width: 8.w),
              Text('توزيع الدرجات', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
            ],
          ),
          SizedBox(height: 16.h),
          if (total > 0)
            ...items.map((i) => Padding(
              padding: EdgeInsets.only(bottom: 8.h),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(width: 10.r, height: 10.r, decoration: BoxDecoration(color: i.color, shape: BoxShape.circle)),
                          SizedBox(width: 8.w),
                          Text(i.label, style: TextStyle(fontSize: 13.sp, color: const Color(AC.textPrimary))),
                        ],
                      ),
                      Text('${i.count} (${i.percent.toStringAsFixed(1)}%)', style: TextStyle(fontSize: 13.sp, color: i.color, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  SizedBox(height: 4.h),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4.r),
                    child: LinearProgressIndicator(
                      value: i.fraction,
                      backgroundColor: const Color(AC.cardBorder),
                      color: i.color,
                      minHeight: 6.h,
                    ),
                  ),
                ],
              ),
            ))
          else
            Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24.h),
                child: Text('لا توجد نتائج بعد', style: TextStyle(fontSize: 14.sp, color: const Color(AC.textSecondary))),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildWeaponCard(List<WeaponStat> byWeapon) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(AC.card),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(AC.cardBorder)),
      ),
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.sports_martial_arts, color: const Color(AC.gold), size: 18.r),
              SizedBox(width: 8.w),
              Text('حسب السلاح', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
            ],
          ),
          SizedBox(height: 12.h),
          if (byWeapon.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 16.h),
              child: Center(child: Text('لا توجد بيانات', style: TextStyle(fontSize: 14.sp, color: const Color(AC.textSecondary)))),
            )
          else
            ...byWeapon.map((w) => Padding(
              padding: EdgeInsets.only(bottom: 8.h),
              child: Row(
                children: [
                  Container(
                    width: 40.r, height: 40.r,
                    decoration: BoxDecoration(
                      color: const Color(AC.gold).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10.r),
                    ),
                    child: Center(child: Text(w.weaponIcon, style: TextStyle(fontSize: 20.sp))),
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(w.weaponName, style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
                        Text('${w.count} فرد', style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary))),
                      ],
                    ),
                  ),
                  ScoreBadge(score: w.avg),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildRecentCard(List<RecentResult> recent) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(AC.card),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(AC.cardBorder)),
      ),
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.history, color: const Color(AC.gold), size: 18.r),
              SizedBox(width: 8.w),
              Text('آخر النتائج', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
            ],
          ),
          SizedBox(height: 12.h),
          if (recent.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 16.h),
              child: Center(child: Text('لا توجد نتائج', style: TextStyle(fontSize: 14.sp, color: const Color(AC.textSecondary)))),
            )
          else
            ...recent.map((r) => Padding(
              padding: EdgeInsets.symmetric(vertical: 6.h),
              child: Row(
                children: [
                  Container(
                    width: 36.r, height: 36.r,
                    decoration: BoxDecoration(
                      color: const Color(AC.gold).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8.r),
                    ),
                    child: Center(child: Icon(Icons.person, color: const Color(AC.gold), size: 18.r)),
                  ),
                  SizedBox(width: 12.w),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.soldierName, style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w500, color: const Color(AC.textPrimary))),
                        if (r.examTitle != null)
                          Text(r.examTitle!, style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary))),
                      ],
                    ),
                  ),
                  ScoreBadge(score: r.totalScore),
                ],
              ),
            )),
        ],
      ),
    );
  }
}

class _TabItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  _TabItem(this.label, this.icon, this.selectedIcon);
}

class _DistItem {
  final String label;
  final int count;
  final int total;
  final Color color;
  _DistItem(this.label, this.count, this.total, this.color);
  double get fraction => total > 0 ? count / total : 0;
  double get percent => total > 0 ? (count / total) * 100 : 0;
}
