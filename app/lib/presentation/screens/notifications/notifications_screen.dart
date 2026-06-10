import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/notifications/notifications_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../data/models/notification_model.dart';
import '../../widgets/score_badge.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    context.read<NotificationsCubit>().loadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<NotificationsCubit, NotificationsState>(
      builder: (ctx, state) {
        if (state is NotificationsInitial) {
          return Center(child: CircularProgressIndicator(color: const Color(AC.gold)));
        }
        if (state is NotificationsError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 48.r, color: const Color(AC.danger)),
                SizedBox(height: 8.h),
                Text(state.message, style: TextStyle(fontSize: 14.sp, color: const Color(AC.danger))),
              ],
            ),
          );
        }
        if (state is! NotificationsLoaded) return const SizedBox();
        final notifs = state.notifications;
        final unread = state.unreadCount;

        if (notifs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.notifications_off_outlined, size: 64.r, color: const Color(AC.textSecondary)),
                SizedBox(height: 12.h),
                Text('لا توجد إشعارات', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
              ],
            ),
          );
        }

        return Column(
          children: [
            if (unread > 0)
              Padding(
                padding: EdgeInsets.fromLTRB(12.w, 8.w, 12.w, 0),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                      decoration: BoxDecoration(color: const Color(AC.danger), borderRadius: BorderRadius.circular(12.r)),
                      child: Text('$unread جديد', style: TextStyle(fontSize: 11.sp, color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () => context.read<NotificationsCubit>().markAllRead(),
                      child: Text('قراءة الكل', style: TextStyle(fontSize: 13.sp, color: const Color(AC.gold))),
                    ),
                  ],
                ),
              ),
            Expanded(
              child: RefreshIndicator(
                color: const Color(AC.gold),
                onRefresh: () => context.read<NotificationsCubit>().loadNotifications(),
                child: ListView.builder(
                  padding: EdgeInsets.all(12.w),
                  itemCount: notifs.length,
                  itemBuilder: (ctx, i) {
                    final n = notifs[i];
                    return _buildNotifItem(n);
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildNotifItem(NotificationModel n) {
    final isRead = n.isRead;
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
          if (!isRead) context.read<NotificationsCubit>().markRead(n.id);
        },
        child: Padding(
          padding: EdgeInsets.all(12.w),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40.r, height: 40.r,
                decoration: BoxDecoration(color: const Color(AC.gold).withOpacity(0.1), borderRadius: BorderRadius.circular(10.r)),
                child: Center(child: Text(n.type == 'evaluation' ? '📋' : '📢', style: TextStyle(fontSize: 20.sp))),
              ),
              SizedBox(width: 12.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(n.message, style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary))),
                    if (n.fitnessScore != null || n.specialtyScore != null || n.disciplineScore != null) ...[
                      SizedBox(height: 4.h),
                      Row(
                        children: [
                          if (n.fitnessScore != null) _scoreBadge('ل ${n.fitnessScore!.toInt()}'),
                          if (n.specialtyScore != null) _scoreBadge('ت ${n.specialtyScore!.toInt()}'),
                          if (n.disciplineScore != null) _scoreBadge('د ${n.disciplineScore!.toInt()}'),
                          if (n.totalScore != null) ScoreBadge(score: n.totalScore!),
                        ],
                      ),
                    ],
                    if (n.evaluatedName != null)
                      Padding(
                        padding: EdgeInsets.only(top: 2.h),
                        child: Text(
                          '${n.evaluatedName}${n.evaluatedRank != null ? ' (${n.evaluatedRank})' : ''}',
                          style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary)),
                        ),
                      ),
                    SizedBox(height: 4.h),
                    Text(
                      n.createdAt?.toString().substring(0, 16) ?? '',
                      style: TextStyle(fontSize: 10.sp, color: const Color(AC.textSecondary).withOpacity(0.6)),
                    ),
                  ],
                ),
              ),
              if (!isRead)
                Container(width: 8.r, height: 8.r, decoration: const BoxDecoration(color: Color(AC.gold), shape: BoxShape.circle)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _scoreBadge(String text) {
    return Container(
      margin: EdgeInsets.only(left: 4.w),
      padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
      decoration: BoxDecoration(
        color: const Color(AC.bg),
        borderRadius: BorderRadius.circular(4.r),
        border: Border.all(color: const Color(AC.cardBorder)),
      ),
      child: Text(text, style: TextStyle(fontSize: 10.sp, color: const Color(AC.textSecondary))),
    );
  }
}
