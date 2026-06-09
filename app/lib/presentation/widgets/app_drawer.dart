import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_constants.dart';
import '../cubits/auth/auth_cubit.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(AC.card),
      width: 280.w,
      child: BlocBuilder<AuthCubit, AuthState>(
        builder: (ctx, state) {
          if (state is! AuthAuthenticated) return const SizedBox();
          final user = state.user;
          return Column(
            children: [
              Container(
                padding: EdgeInsets.fromLTRB(20.w, 48.h, 20.w, 24.h),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: const Color(AC.cardBorder), width: 0.5)),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 36.r,
                      backgroundColor: const Color(AC.gold).withOpacity(0.15),
                      child: Icon(Icons.shield, size: 36.r, color: const Color(AC.gold)),
                    ),
                    SizedBox(height: 12.h),
                    Text(user.name, style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.textPrimary))),
                    SizedBox(height: 4.h),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
                      decoration: BoxDecoration(
                        color: const Color(AC.gold).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20.r),
                      ),
                      child: Text(
                        user.role == 'commander' ? 'قائد' : user.role == 'officer' ? 'ضابط' : 'ضابط صف',
                        style: TextStyle(fontSize: 12.sp, color: const Color(AC.gold), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.info_outline, size: 48.r, color: const Color(AC.textSecondary)),
                    SizedBox(height: 8.h),
                    Text('كتيبة 20', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                    Text('نظام التقييم العسكري', style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary).withOpacity(0.6))),
                    SizedBox(height: 4.h),
                    Text('الإصدار 2.0.0', style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary).withOpacity(0.4))),
                  ],
                ),
              ),
              Container(
                padding: EdgeInsets.all(16.w),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: const Color(AC.cardBorder), width: 0.5)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      context.read<AuthCubit>().logout();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.logout, size: 18),
                    label: Text('تسجيل الخروج', style: TextStyle(fontSize: 14.sp)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(AC.danger).withOpacity(0.15),
                      foregroundColor: const Color(AC.danger),
                      padding: EdgeInsets.symmetric(vertical: 12.h),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8.r),
                        side: BorderSide(color: const Color(AC.danger).withOpacity(0.3)),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
