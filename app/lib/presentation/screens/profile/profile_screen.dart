import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/models/user_model.dart';
import '../../../data/repositories/api_repository.dart';
import '../../cubits/auth/auth_cubit.dart';
import '../../widgets/toast_helper.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameCtrl = TextEditingController();
  List<Map<String, dynamic>> _ranks = [];
  bool _editing = false;
  bool _loading = false;
  String? _selectedRankId;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  void _startEdit(UserModel user) {
    _nameCtrl.text = user.name;
    _selectedRankId = null;
    _loadRanks();
    setState(() => _editing = true);
  }

  void _loadRanks() async {
    try {
      final repo = ApiRepository(context.read<ApiService>());
      _ranks = await repo.getRanks();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _save(UserModel user) async {
    if (_nameCtrl.text.isEmpty) return;
    setState(() => _loading = true);
    try {
      final repo = ApiRepository(context.read<ApiService>());
      await repo.updateUserPassword(user.id, ''); // placeholder
      showToast(context, 'تم التحديث', isSuccess: true);
      setState(() => _editing = false);
    } catch (e) {
      showToast(context, 'فشل التحديث', isError: true);
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthCubit, AuthState>(
      builder: (ctx, state) {
        if (state is! AuthAuthenticated) return const SizedBox();
        final user = state.user;
        final isCommander = user.role == 'commander';

        return SingleChildScrollView(
          padding: EdgeInsets.all(16.w),
          child: Column(
            children: [
              SizedBox(height: 20.h),
              CircleAvatar(
                radius: 48.r,
                backgroundColor: const Color(AC.gold).withOpacity(0.15),
                child: Icon(Icons.shield, size: 48.r, color: const Color(AC.gold)),
              ),
              if (isCommander && _editing) SizedBox(height: 8.h),
              if (isCommander && _editing)
                TextButton.icon(
                  onPressed: () {},
                  icon: Icon(Icons.camera_alt_outlined, size: 16.r, color: const Color(AC.gold)),
                  label: Text('تغيير الصورة', style: TextStyle(fontSize: 12.sp, color: const Color(AC.gold))),
                ),
              SizedBox(height: 16.h),
              Card(
                color: const Color(AC.card),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r), side: const BorderSide(color: Color(AC.cardBorder))),
                child: Padding(
                  padding: EdgeInsets.all(16.w),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.person_outline, size: 18.r, color: const Color(AC.gold)),
                          SizedBox(width: 8.w),
                          Text('البيانات الشخصية', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                          const Spacer(),
                          if (isCommander && !_editing)
                            IconButton(
                              icon: Icon(Icons.edit, size: 18.r, color: const Color(AC.gold)),
                              onPressed: () => _startEdit(user),
                            ),
                        ],
                      ),
                      SizedBox(height: 16.h),
                      if (_editing) ...[
                        TextField(
                          controller: _nameCtrl,
                          decoration: const InputDecoration(labelText: 'الاسم'),
                          style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary)),
                        ),
                        SizedBox(height: 12.h),
                        DropdownButtonFormField<String>(
                          value: _selectedRankId,
                          decoration: const InputDecoration(labelText: 'الرتبة'),
                          dropdownColor: const Color(AC.card),
                          items: [const DropdownMenuItem(value: null, child: Text('بدون رتبة')), ..._ranks.map((r) => DropdownMenuItem(value: r['id'], child: Text(r['name'] ?? '')))],
                          onChanged: (v) => setState(() => _selectedRankId = v),
                        ),
                        SizedBox(height: 16.h),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: _loading ? null : () => _save(user),
                                style: ElevatedButton.styleFrom(padding: EdgeInsets.symmetric(vertical: 12.h)),
                                child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('حفظ'),
                              ),
                            ),
                            SizedBox(width: 12.w),
                            Expanded(
                              child: TextButton(
                                onPressed: () => setState(() => _editing = false),
                                child: const Text('إلغاء'),
                              ),
                            ),
                          ],
                        ),
                      ] else ...[
                        _infoRow('الاسم', user.name),
                        _infoRow('اسم المستخدم', user.username),
                        _infoRow('الدور', user.roleLabel),
                        _infoRow('الرتبة', user.rankName ?? 'غير محدد'),
                      ],
                    ],
                  ),
                ),
              ),
              SizedBox(height: 16.h),
              Card(
                color: const Color(AC.card),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r), side: const BorderSide(color: Color(AC.cardBorder))),
                child: Padding(
                  padding: EdgeInsets.all(16.w),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline, size: 18.r, color: const Color(AC.gold)),
                          SizedBox(width: 8.w),
                          Text('عن التطبيق', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                        ],
                      ),
                      SizedBox(height: 12.h),
                      Center(
                        child: Column(
                          children: [
                            Text('🛡️ كتيبة 20', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                            SizedBox(height: 4.h),
                            Text('نظام التقييم العسكري', style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary))),
                            SizedBox(height: 8.h),
                            Text('الإصدار 2.0.0', style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary).withOpacity(0.6))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.only(bottom: 12.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80.w,
            child: Text(label, style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary))),
          ),
          Expanded(child: Text(value, style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary), fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}
