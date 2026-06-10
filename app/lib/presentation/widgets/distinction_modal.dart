import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_service.dart';
import '../../data/repositories/api_repository.dart';
import 'toast_helper.dart';

class DistinctionModal {
  static Future<void> show({
    required BuildContext context,
    required String soldierId,
    required String soldierName,
    String? currentBadge,
    String? currentCitation,
    VoidCallback? onChanged,
  }) async {
    final repo = ApiRepository(context.read<ApiService>());
    final citCtrl = TextEditingController(text: currentCitation ?? '');
    String? selectedBadge = currentBadge;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AC.card),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(20.w, 16.w, 20.w, MediaQuery.of(ctx).viewInsets.bottom + 16.h),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Center(child: Container(width: 48.w, height: 4.h, decoration: BoxDecoration(color: const Color(AC.cardBorder), borderRadius: BorderRadius.circular(2.r)))),
                    SizedBox(height: 16.h),
                    Text('🎖️ تمييز ${soldierName}', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                    SizedBox(height: 20.h),
                    Text('اختر الوسام:', style: TextStyle(fontSize: 14.sp, color: const Color(AC.textSecondary))),
                    SizedBox(height: 12.h),
                    Row(
                      children: [
                        _badgeOption(ctx, '🥇', 'ذهبي', 'gold', selectedBadge == 'gold', (v) { setState(() => selectedBadge = v); }),
                        SizedBox(width: 8.w),
                        _badgeOption(ctx, '🥈', 'فضي', 'silver', selectedBadge == 'silver', (v) { setState(() => selectedBadge = v); }),
                        SizedBox(width: 8.w),
                        _badgeOption(ctx, '🥉', 'برونزي', 'bronze', selectedBadge == 'bronze', (v) { setState(() => selectedBadge = v); }),
                      ],
                    ),
                    SizedBox(height: 16.h),
                    TextField(
                      controller: citCtrl,
                      decoration: InputDecoration(
                        labelText: 'سبب التمييز',
                        contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                      ),
                      style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary)),
                      maxLines: 3,
                    ),
                    SizedBox(height: 20.h),
                    Row(
                      children: [
                        if (currentBadge != null)
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                try {
                                  await repo.removeDistinction(soldierId);
                                  if (ctx.mounted) Navigator.pop(ctx);
                                  onChanged?.call();
                                  if (context.mounted) showToast(context, 'تم إزالة التمييز', isSuccess: true);
                                } catch (_) {
                                  if (context.mounted) showToast(context, 'فشل إزالة التمييز');
                                }
                              },
                              icon: const Icon(Icons.delete_outline, size: 16),
                              label: Text('إزالة التمييز', style: TextStyle(fontSize: 13.sp)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(AC.danger).withOpacity(0.15),
                                foregroundColor: const Color(AC.danger),
                              ),
                            ),
                          ),
                        if (currentBadge != null) SizedBox(width: 12.w),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: selectedBadge == null || citCtrl.text.isEmpty ? null : () async {
                              try {
                                await repo.distinguishSoldier(soldierId, selectedBadge!, citCtrl.text);
                                if (ctx.mounted) Navigator.pop(ctx);
                                onChanged?.call();
                                if (context.mounted) showToast(context, '🎖️ تم منح الوسام', isSuccess: true);
                              } catch (_) {
                                if (context.mounted) showToast(context, 'فشل منح الوسام');
                              }
                            },
                            style: ElevatedButton.styleFrom(padding: EdgeInsets.symmetric(vertical: 14.h)),
                            child: Text(currentBadge != null ? 'تحديث' : 'منح الوسام', style: TextStyle(fontSize: 14.sp)),
                          ),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            style: TextButton.styleFrom(foregroundColor: const Color(AC.textSecondary)),
                            child: Text('إلغاء', style: TextStyle(fontSize: 14.sp)),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8.h),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  static Widget _badgeOption(BuildContext context, String emoji, String label, String value, bool selected, ValueChanged<String> onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(value),
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 12.h),
          decoration: BoxDecoration(
            color: selected ? const Color(AC.gold).withOpacity(0.15) : const Color(AC.bg),
            borderRadius: BorderRadius.circular(12.r),
            border: Border.all(color: selected ? const Color(AC.gold).withOpacity(0.5) : const Color(AC.cardBorder)),
          ),
          child: Column(
            children: [
              Text(emoji, style: TextStyle(fontSize: 28.sp)),
              SizedBox(height: 4.h),
              Text(label, style: TextStyle(fontSize: 13.sp, color: selected ? const Color(AC.gold) : const Color(AC.textSecondary), fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
            ],
          ),
        ),
      ),
    );
  }
}
