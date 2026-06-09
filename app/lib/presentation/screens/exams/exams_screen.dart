import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/exams/exams_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../widgets/score_badge.dart';

class ExamsScreen extends StatefulWidget {
  const ExamsScreen({super.key});

  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _tabCtrl.addListener(() {
      if (!_tabCtrl.indexIsChanging) {
        final types = ['general', 'weapon', 'specialty'];
        context.read<ExamsCubit>().loadExams(type: types[_tabCtrl.index]);
      }
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  void _showCreateDialog() {
    final api = context.read<ApiService>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AC.card),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) => _ExamFormSheet(api: api, onCreated: () {
        final types = ['general', 'weapon', 'specialty'];
        context.read<ExamsCubit>().loadExams(type: types[_tabCtrl.index]);
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(12.w, 8.h, 12.w, 0),
          child: Row(
            children: [
              Expanded(
                child: TabBar(
                  controller: _tabCtrl,
                  labelColor: const Color(AC.gold),
                  unselectedLabelColor: const Color(AC.textSecondary),
                  indicatorColor: const Color(AC.gold),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelStyle: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w600),
                  unselectedLabelStyle: TextStyle(fontSize: 13.sp),
                  tabs: [
                    Tab(text: 'عام'),
                    Tab(text: 'سلاح'),
                    Tab(text: 'تخصص'),
                  ],
                ),
              ),
              SizedBox(width: 8.w),
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
          child: TabBarView(
            controller: _tabCtrl,
            children: List.generate(3, (_) =>
              BlocBuilder<ExamsCubit, ExamsState>(
                builder: (ctx, state) {
                  if (state is ExamsLoading) {
                    return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
                  }
                  if (state is ExamsError) {
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
                  if (state is! ExamsLoaded) return const SizedBox();
                  final exams = state.exams;
                  if (exams.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_outlined, size: 64.r, color: const Color(AC.textSecondary)),
                          SizedBox(height: 12.h),
                          Text('لا توجد امتحانات', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                        ],
                      ),
                    );
                  }
                  return ListView.builder(
                    padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
                    itemCount: exams.length,
                    itemBuilder: (ctx, i) {
                      final e = exams[i];
                      final typeIcon = e.type == 'general' ? Icons.description : e.type == 'weapon' ? Icons.sports_martial_arts : Icons.school;
                      return Container(
                        margin: EdgeInsets.only(bottom: 8.h),
                        decoration: BoxDecoration(
                          color: const Color(AC.card),
                          borderRadius: BorderRadius.circular(12.r),
                          border: Border.all(color: const Color(AC.cardBorder)),
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(14.w),
                          child: Row(
                            children: [
                              Container(
                                width: 44.r, height: 44.r,
                                decoration: BoxDecoration(
                                  color: const Color(AC.gold).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12.r),
                                ),
                                child: Icon(typeIcon, color: const Color(AC.gold), size: 22.r),
                              ),
                              SizedBox(width: 12.w),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(e.title, style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
                                    SizedBox(height: 2.h),
                                    Row(
                                      children: [
                                        _infoChip('${e.itemCount} بند', Icons.list),
                                        SizedBox(width: 8.w),
                                        _infoChip('${e.resultCount} نتيجة', Icons.grading),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              if (e.avgScore != null) ScoreBadge(score: e.avgScore!),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _infoChip(String label, IconData icon) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12.r, color: const Color(AC.textSecondary)),
        SizedBox(width: 3.w),
        Text(label, style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary))),
      ],
    );
  }
}

class _ExamFormSheet extends StatefulWidget {
  final ApiService api;
  final VoidCallback onCreated;
  const _ExamFormSheet({required this.api, required this.onCreated});

  @override
  State<_ExamFormSheet> createState() => _ExamFormSheetState();
}

class _ExamFormSheetState extends State<_ExamFormSheet> {
  final _titleCtrl = TextEditingController();
  final _itemsCtrl = TextEditingController();
  String _type = 'general';
  String? _weaponId;
  List<Map<String, dynamic>> _weapons = [];

  @override
  void initState() {
    super.initState();
    _loadWeapons();
  }

  void _loadWeapons() async {
    try {
      final repo = ApiRepository(widget.api);
      _weapons = await repo.getWeapons();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _save() async {
    if (_titleCtrl.text.isEmpty) return;
    final itemsText = _itemsCtrl.text.trim();
    if (itemsText.isEmpty) return;
    final items = itemsText.split('\n')
        .where((l) => l.trim().isNotEmpty)
        .map((l) {
          final parts = l.split('|');
          return {'text': parts[0].trim(), 'maxScore': parts.length > 1 ? double.tryParse(parts[1].trim()) ?? 10 : 10};
        }).toList();
    if (items.isEmpty) return;
    final data = {
      'title': _titleCtrl.text,
      'type': _type,
      'weaponId': _type == 'weapon' ? _weaponId : null,
      'items': items,
    };
    try {
      final repo = ApiRepository(widget.api);
      await repo.createExam(data);
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('فشل إنشاء الامتحان', style: TextStyle(fontSize: 14.sp)),
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
    _itemsCtrl.dispose();
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
            Text('إنشاء امتحان', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
            SizedBox(height: 16.h),
            TextField(controller: _titleCtrl, decoration: InputDecoration(labelText: 'عنوان الامتحان', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h))),
            SizedBox(height: 12.h),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: InputDecoration(labelText: 'النوع', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
              dropdownColor: const Color(AC.card),
              items: const [
                DropdownMenuItem(value: 'general', child: Text('عام')),
                DropdownMenuItem(value: 'weapon', child: Text('سلاح')),
                DropdownMenuItem(value: 'specialty', child: Text('تخصص')),
              ],
              onChanged: (v) => setState(() => _type = v!),
            ),
            if (_type == 'weapon') ...[
              SizedBox(height: 12.h),
              DropdownButtonFormField<String>(
                decoration: InputDecoration(labelText: 'السلاح', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                dropdownColor: const Color(AC.card),
                items: _weapons.map<DropdownMenuItem<String>>((w) => DropdownMenuItem<String>(
                  value: w['id'] as String?, child: Text(w['name'] ?? '', style: TextStyle(fontSize: 14.sp)),
                )).toList(),
                onChanged: (v) => setState(() => _weaponId = v),
              ),
            ],
            SizedBox(height: 12.h),
            TextField(
              controller: _itemsCtrl,
              decoration: InputDecoration(
                labelText: 'بنود الامتحان',
                hintText: 'البند الأول | 10\nالبند الثاني | 15',
                hintStyle: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary).withOpacity(0.5)),
                contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
              ),
              maxLines: 6,
              style: TextStyle(fontSize: 14.sp),
            ),
            SizedBox(height: 4.h),
            Text('اكتب كل بند في سطر جديد، استخدم | لتحديد الدرجة القصوى',
                style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary))),
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
                    child: Text('إنشاء', style: TextStyle(fontSize: 15.sp)),
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
