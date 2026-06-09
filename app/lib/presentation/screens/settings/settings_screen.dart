import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/settings/settings_cubit.dart';
import '../../cubits/auth/auth_cubit.dart';
import '../../../core/network/api_service.dart';
import '../../../core/constants/app_constants.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => SettingsCubit(context.read<ApiService>()),
      child: _SettingsBody(),
    );
  }
}

class _SettingsBody extends StatefulWidget {
  @override
  State<_SettingsBody> createState() => _SettingsBodyState();
}

class _SettingsBodyState extends State<_SettingsBody> {
  final _oldPwCtrl = TextEditingController();
  final _newPwCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _oldPwCtrl.dispose();
    _newPwCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _changePassword() {
    if (_oldPwCtrl.text.isEmpty || _newPwCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(_snack('يرجى ملء جميع الحقول', const Color(AC.danger)));
      return;
    }
    if (_newPwCtrl.text.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(_snack('كلمة المرور الجديدة قصيرة جداً', const Color(AC.danger)));
      return;
    }
    if (_newPwCtrl.text != _confirmCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(_snack('كلمتا المرور غير متطابقتين', const Color(AC.danger)));
      return;
    }
    context.read<SettingsCubit>().changePassword(_oldPwCtrl.text, _newPwCtrl.text);
  }

  SnackBar _snack(String msg, Color color) => SnackBar(
    content: Text(msg, style: TextStyle(fontSize: 14.sp)),
    backgroundColor: color,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
  );

  @override
  Widget build(BuildContext context) {
    final user = context.select((AuthCubit c) => c.state is AuthAuthenticated ? (c.state as AuthAuthenticated).user : null);

    return BlocListener<SettingsCubit, SettingsState>(
      listener: (ctx, state) {
        if (state is SettingsPasswordChanged) {
          ScaffoldMessenger.of(context).showSnackBar(_snack(state.message, const Color(AC.success)));
          _oldPwCtrl.clear();
          _newPwCtrl.clear();
          _confirmCtrl.clear();
        } else if (state is SettingsError) {
          ScaffoldMessenger.of(context).showSnackBar(_snack(state.message, const Color(AC.danger)));
        }
      },
      child: SingleChildScrollView(
        padding: EdgeInsets.all(16.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionHeader('الحساب', Icons.account_circle),
            SizedBox(height: 12.h),
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(AC.card),
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(AC.cardBorder)),
              ),
              padding: EdgeInsets.all(16.w),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 32.r,
                    backgroundColor: const Color(AC.gold).withOpacity(0.15),
                    child: Icon(Icons.shield, size: 32.r, color: const Color(AC.gold)),
                  ),
                  SizedBox(height: 8.h),
                  Text(user?.name ?? '', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.textPrimary))),
                  Text('@${user?.username ?? ''}', style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary))),
                  SizedBox(height: 4.h),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: const Color(AC.gold).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12.r),
                    ),
                    child: Text(
                      user?.role == 'commander' ? 'قائد' : user?.role == 'officer' ? 'ضابط' : 'ضابط صف',
                      style: TextStyle(fontSize: 12.sp, color: const Color(AC.gold), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24.h),
            _sectionHeader('تغيير كلمة المرور', Icons.lock_outline),
            SizedBox(height: 12.h),
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(AC.card),
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(AC.cardBorder)),
              ),
              padding: EdgeInsets.all(16.w),
              child: Column(
                children: [
                  _passwordField(_oldPwCtrl, 'كلمة المرور القديمة', _obscureOld, () => setState(() => _obscureOld = !_obscureOld)),
                  SizedBox(height: 12.h),
                  _passwordField(_newPwCtrl, 'كلمة المرور الجديدة', _obscureNew, () => setState(() => _obscureNew = !_obscureNew)),
                  SizedBox(height: 12.h),
                  _passwordField(_confirmCtrl, 'تأكيد كلمة المرور', _obscureConfirm, () => setState(() => _obscureConfirm = !_obscureConfirm)),
                  SizedBox(height: 16.h),
                  BlocBuilder<SettingsCubit, SettingsState>(
                    builder: (ctx, state) {
                      if (state is SettingsLoading) {
                        return Center(child: CircularProgressIndicator(color: const Color(AC.gold)));
                      }
                      return SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _changePassword,
                          style: ElevatedButton.styleFrom(
                            padding: EdgeInsets.symmetric(vertical: 14.h),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                          ),
                          child: Text('تغيير كلمة المرور', style: TextStyle(fontSize: 15.sp)),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            SizedBox(height: 24.h),
            _sectionHeader('حول التطبيق', Icons.info_outline),
            SizedBox(height: 12.h),
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(AC.card),
                borderRadius: BorderRadius.circular(12.r),
                border: Border.all(color: const Color(AC.cardBorder)),
              ),
              padding: EdgeInsets.all(16.w),
              child: Column(
                children: [
                  _infoRow('التطبيق', 'كتيبة 20'),
                  _infoRow('الإصدار', '2.0.0'),
                  _infoRow('النظام', 'نظام التقييم العسكري'),
                ],
              ),
            ),
            SizedBox(height: 24.h),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: const Color(AC.card),
                      title: Text('تسجيل الخروج', style: TextStyle(fontSize: 18.sp, color: const Color(AC.gold))),
                      content: Text('هل أنت متأكد؟', style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary))),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('إلغاء'),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            context.read<AuthCubit>().logout();
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(AC.danger)),
                          child: const Text('تسجيل الخروج'),
                        ),
                      ],
                    ),
                  );
                },
                icon: const Icon(Icons.logout, size: 18),
                label: Text('تسجيل الخروج', style: TextStyle(fontSize: 15.sp)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(AC.danger).withOpacity(0.15),
                  foregroundColor: const Color(AC.danger),
                  padding: EdgeInsets.symmetric(vertical: 14.h),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8.r),
                    side: BorderSide(color: const Color(AC.danger).withOpacity(0.3)),
                  ),
                ),
              ),
            ),
            SizedBox(height: 32.h),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: const Color(AC.gold), size: 18.r),
        SizedBox(width: 8.w),
        Text(title, style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
      ],
    );
  }

  Widget _passwordField(TextEditingController ctrl, String label, bool obscure, VoidCallback toggle) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
        suffixIcon: IconButton(
          icon: Icon(obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18.r, color: const Color(AC.textSecondary)),
          onPressed: toggle,
        ),
      ),
      style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary)),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 6.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14.sp, color: const Color(AC.textSecondary))),
          Text(value, style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
        ],
      ),
    );
  }
}
