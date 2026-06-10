import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../widgets/score_badge.dart';

class NotificationsScreen extends StatefulWidget {
  final ApiService api;
  const NotificationsScreen({super.key, required this.api});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _notifs = [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final repo = ApiRepository(widget.api);
      final notifs = await repo.getNotifications();
      if (mounted) setState(() { _notifs = notifs; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(String id) async {
    try {
      final repo = ApiRepository(widget.api);
      await repo.markNotificationRead(id);
      _load();
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    try {
      final repo = ApiRepository(widget.api);
      await repo.markAllNotificationsRead();
      _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final unread = _notifs.where((n) => n['is_read'] != true).length;

    return Scaffold(
      backgroundColor: const Color(AC.bg),
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.notifications_outlined, color: const Color(AC.gold), size: 20.r),
            SizedBox(width: 8.w),
            Text('الإشعارات', style: TextStyle(fontSize: 18.sp)),
            if (unread > 0) ...[
              SizedBox(width: 8.w),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                decoration: BoxDecoration(
                  color: const Color(AC.danger),
                  borderRadius: BorderRadius.circular(12.r),
                ),
                child: Text('$unread', style: TextStyle(fontSize: 11.sp, color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
        centerTitle: true,
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: _markAllRead,
              child: Text('قراءة الكل', style: TextStyle(fontSize: 13.sp, color: const Color(AC.gold))),
            ),
          SizedBox(width: 8.w),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(AC.gold)))
          : _notifs.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_off_outlined, size: 64.r, color: const Color(AC.textSecondary)),
                      SizedBox(height: 12.h),
                      Text('لا توجد إشعارات', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: const Color(AC.gold),
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: EdgeInsets.all(12.w),
                    itemCount: _notifs.length,
                    itemBuilder: (ctx, i) {
                      final n = _notifs[i];
                      final isRead = n['is_read'] == true;
                      return Container(
                        margin: EdgeInsets.only(bottom: 8.h),
                        decoration: BoxDecoration(
                          color: isRead ? const Color(AC.card) : const Color(AC.card).withOpacity(0.8),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(
                            color: isRead ? const Color(AC.cardBorder) : const Color(AC.gold).withOpacity(0.3),
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12.r),
                          onTap: () {
                            if (!isRead) _markRead(n['id']);
                          },
                          child: Padding(
                            padding: EdgeInsets.all(12.w),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 40.r, height: 40.r,
                                  decoration: BoxDecoration(
                                    color: const Color(AC.gold).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10.r),
                                  ),
                                  child: Center(
                                    child: Text(n['type'] == 'evaluation' ? '📋' : '📢', style: TextStyle(fontSize: 20.sp)),
                                  ),
                                ),
                                SizedBox(width: 12.w),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (n['message'] != null)
                                        Text(n['message'], style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary))),
                                      if (n['fitness_score'] != null || n['specialty_score'] != null || n['discipline_score'] != null) ...[
                                        SizedBox(height: 4.h),
                                        Row(
                                          children: [
                                            if (n['fitness_score'] != null)
                                              Container(
                                                margin: EdgeInsets.only(left: 4.w),
                                                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                                                decoration: BoxDecoration(
                                                  color: const Color(AC.bg),
                                                  borderRadius: BorderRadius.circular(4.r),
                                                  border: Border.all(color: const Color(AC.cardBorder)),
                                                ),
                                                child: Text('ل ${(n['fitness_score'] as num).toInt()}', style: TextStyle(fontSize: 10.sp, color: const Color(AC.textSecondary))),
                                              ),
                                            if (n['specialty_score'] != null)
                                              Container(
                                                margin: EdgeInsets.only(left: 4.w),
                                                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                                                decoration: BoxDecoration(
                                                  color: const Color(AC.bg),
                                                  borderRadius: BorderRadius.circular(4.r),
                                                  border: Border.all(color: const Color(AC.cardBorder)),
                                                ),
                                                child: Text('ت ${(n['specialty_score'] as num).toInt()}', style: TextStyle(fontSize: 10.sp, color: const Color(AC.textSecondary))),
                                              ),
                                            if (n['discipline_score'] != null)
                                              Container(
                                                margin: EdgeInsets.only(left: 4.w),
                                                padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
                                                decoration: BoxDecoration(
                                                  color: const Color(AC.bg),
                                                  borderRadius: BorderRadius.circular(4.r),
                                                  border: Border.all(color: const Color(AC.cardBorder)),
                                                ),
                                                child: Text('د ${(n['discipline_score'] as num).toInt()}', style: TextStyle(fontSize: 10.sp, color: const Color(AC.textSecondary))),
                                              ),
                                            if (n['total_score'] != null)
                                              ScoreBadge(score: (n['total_score'] as num).toDouble()),
                                          ],
                                        ),
                                      ],
                                      if (n['evaluated_name'] != null)
                                        Padding(
                                          padding: EdgeInsets.only(top: 2.h),
                                          child: Text(
                                            '${n['evaluated_name']}${n['evaluated_rank'] != null ? ' (${n['evaluated_rank']})' : ''}',
                                            style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary)),
                                          ),
                                        ),
                                      SizedBox(height: 4.h),
                                      Text(
                                        n['created_at']?.toString().substring(0, 16) ?? '',
                                        style: TextStyle(fontSize: 10.sp, color: const Color(AC.textSecondary).withOpacity(0.6)),
                                      ),
                                    ],
                                  ),
                                ),
                                if (!isRead)
                                  Container(
                                    width: 8.r, height: 8.r,
                                    decoration: const BoxDecoration(
                                      color: Color(AC.gold),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
