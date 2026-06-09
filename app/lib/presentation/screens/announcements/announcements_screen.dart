import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/announcements/announcements_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  void _showCreateDialog() {
    final api = context.read<ApiService>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AC.card),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) => _AnnouncementFormSheet(api: api, onCreated: () {
        context.read<AnnouncementsCubit>().loadAnnouncements();
      }),
    );
  }

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'urgent': return const Color(AC.danger);
      case 'info': return const Color(AC.success);
      default: return const Color(AC.gold);
    }
  }

  String _priorityLabel(String priority) {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'info': return 'معلومات';
      default: return 'عادي';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16.w, 12.h, 12.w, 8.h),
          child: Row(
            children: [
              Icon(Icons.campaign, color: const Color(AC.gold), size: 20.r),
              SizedBox(width: 8.w),
              Text('الإعلانات', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
              const Spacer(),
              Container(
                width: 44.r, height: 44.r,
                decoration: BoxDecoration(
                  color: const Color(AC.gold).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12.r),
                ),
                child: IconButton(
                  icon: Icon(Icons.add, color: const Color(AC.gold), size: 22.r),
                  onPressed: _showCreateDialog,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: BlocBuilder<AnnouncementsCubit, AnnouncementsState>(
            builder: (ctx, state) {
              if (state is AnnouncementsLoading) {
                return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
              }
              if (state is AnnouncementsError) {
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
              if (state is! AnnouncementsLoaded) return const SizedBox();
              final announcements = state.announcements;
              if (announcements.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.campaign_outlined, size: 64.r, color: const Color(AC.textSecondary)),
                      SizedBox(height: 12.h),
                      Text('لا توجد إعلانات', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                color: const Color(AC.gold),
                onRefresh: () => context.read<AnnouncementsCubit>().loadAnnouncements(),
                child: ListView.builder(
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
                  itemCount: announcements.length,
                  itemBuilder: (ctx, i) {
                    final a = announcements[i];
                    final priority = a['priority'] ?? 'normal';
                    final pColor = _priorityColor(priority);
                    return Container(
                      margin: EdgeInsets.only(bottom: 8.h),
                      decoration: BoxDecoration(
                        color: const Color(AC.card),
                        borderRadius: BorderRadius.circular(12.r),
                        border: Border.all(color: const Color(AC.cardBorder)),
                      ),
                      child: Padding(
                        padding: EdgeInsets.all(14.w),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                                  decoration: BoxDecoration(
                                    color: pColor.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(6.r),
                                    border: Border.all(color: pColor.withOpacity(0.3)),
                                  ),
                                  child: Text(
                                    _priorityLabel(priority),
                                    style: TextStyle(
                                      fontSize: 10.sp,
                                      color: pColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                SizedBox(width: 8.w),
                                Expanded(
                                  child: Text(a['title'] ?? '', style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
                                ),
                              ],
                            ),
                            if (a['body'] != null && (a['body'] as String).isNotEmpty) ...[
                              SizedBox(height: 8.h),
                              Text(a['body'], style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary)), maxLines: 4, overflow: TextOverflow.ellipsis),
                            ],
                            SizedBox(height: 8.h),
                            Text(
                              '${a['created_by_name'] ?? ''} • ${a['created_at']?.toString().substring(0, 10) ?? ''}',
                              style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary).withOpacity(0.6)),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AnnouncementFormSheet extends StatefulWidget {
  final ApiService api;
  final VoidCallback onCreated;
  const _AnnouncementFormSheet({required this.api, required this.onCreated});

  @override
  State<_AnnouncementFormSheet> createState() => _AnnouncementFormSheetState();
}

class _AnnouncementFormSheetState extends State<_AnnouncementFormSheet> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  String _priority = 'normal';

  Future<void> _save() async {
    if (_titleCtrl.text.isEmpty) return;
    try {
      final repo = ApiRepository(widget.api);
      await repo.createAnnouncement({
        'title': _titleCtrl.text,
        'body': _bodyCtrl.text.isNotEmpty ? _bodyCtrl.text : null,
        'priority': _priority,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('فشل إنشاء الإعلان', style: TextStyle(fontSize: 14.sp)),
          backgroundColor: const Color(AC.danger),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
        ));
      }
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 16.w, 20.w, bottomInset + 16.h),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 48.w, height: 4.h,
                decoration: BoxDecoration(
                  color: const Color(AC.cardBorder),
                  borderRadius: BorderRadius.circular(2.r),
                ),
              ),
            ),
            SizedBox(height: 16.h),
            Text('إعلان جديد', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
            SizedBox(height: 16.h),
            TextField(controller: _titleCtrl, decoration: InputDecoration(labelText: 'العنوان', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h))),
            SizedBox(height: 12.h),
            TextField(controller: _bodyCtrl, decoration: InputDecoration(labelText: 'المحتوى', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)), maxLines: 4),
            SizedBox(height: 12.h),
            DropdownButtonFormField<String>(
              value: _priority,
              decoration: InputDecoration(labelText: 'الأولوية', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
              dropdownColor: const Color(AC.card),
              items: const [
                DropdownMenuItem(value: 'normal', child: Text('عادي')),
                DropdownMenuItem(value: 'info', child: Text('معلومات')),
                DropdownMenuItem(value: 'urgent', child: Text('عاجل')),
              ],
              onChanged: (v) => setState(() => _priority = v!),
            ),
            SizedBox(height: 20.h),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.symmetric(vertical: 14.h),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                    ),
                    child: Text('نشر', style: TextStyle(fontSize: 15.sp)),
                  ),
                ),
                SizedBox(width: 12.w),
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.symmetric(vertical: 14.h),
                      foregroundColor: const Color(AC.textSecondary),
                    ),
                    child: Text('إلغاء', style: TextStyle(fontSize: 15.sp)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
