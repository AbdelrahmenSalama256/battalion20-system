import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/fitness/fitness_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

class FitnessScreen extends StatefulWidget {
  const FitnessScreen({super.key});

  @override
  State<FitnessScreen> createState() => _FitnessScreenState();
}

class _FitnessScreenState extends State<FitnessScreen> {
  void _showResultDialog() {
    final api = context.read<ApiService>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AC.card),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) => _FitnessResultSheet(api: api, onSaved: () {
        context.read<FitnessCubit>().loadExercises();
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FitnessCubit, FitnessState>(
      listener: (ctx, state) {
        if (state is FitnessSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message, style: TextStyle(fontSize: 14.sp)),
            backgroundColor: const Color(AC.success),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
          ));
        } else if (state is FitnessError) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message, style: TextStyle(fontSize: 14.sp)),
            backgroundColor: const Color(AC.danger),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
          ));
        }
      },
      builder: (ctx, state) {
        if (state is FitnessLoading) {
          return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
        }
        if (state is FitnessError) {
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
        if (state is! FitnessLoaded) return const SizedBox();
        final exercises = state.exercises;
        return Column(
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(16.w, 12.h, 12.w, 8.h),
              child: Row(
                children: [
                  Icon(Icons.fitness_center, color: const Color(AC.gold), size: 20.r),
                  SizedBox(width: 8.w),
                  Text('تمارين اللياقة', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                  const Spacer(),
                  Container(
                    width: 44.r, height: 44.r,
                    decoration: BoxDecoration(
                      color: const Color(AC.gold).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12.r),
                    ),
                    child: IconButton(
                      icon: Icon(Icons.add, color: const Color(AC.gold), size: 22.r),
                      onPressed: _showResultDialog,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: exercises.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.fitness_center_outlined, size: 64.r, color: const Color(AC.textSecondary)),
                          SizedBox(height: 12.h),
                          Text('لا توجد تمارين', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      color: const Color(AC.gold),
                      onRefresh: () => context.read<FitnessCubit>().loadExercises(),
                      child: ListView.builder(
                        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
                        itemCount: exercises.length,
                        itemBuilder: (ctx, i) {
                          final ex = exercises[i];
                          final unit = ex['unit'] ?? '-';
                          final passMark = ex['pass_mark'] ?? 60;
                          final higherBetter = ex['higher_is_better'] == true;
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
                                    child: Icon(Icons.fitness_center, color: const Color(AC.gold), size: 22.r),
                                  ),
                                  SizedBox(width: 12.w),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(ex['name'] ?? '', style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
                                        SizedBox(height: 2.h),
                                        Text(
                                          'الوحدة: $unit • علامة النجاح: $passMark',
                                          style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                                    decoration: BoxDecoration(
                                      color: const Color(AC.gold).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6.r),
                                    ),
                                    child: Text(
                                      higherBetter ? 'أعلى أفضل' : 'أقل أفضل',
                                      style: TextStyle(fontSize: 10.sp, color: const Color(AC.gold), fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _FitnessResultSheet extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;
  const _FitnessResultSheet({required this.api, required this.onSaved});

  @override
  State<_FitnessResultSheet> createState() => _FitnessResultSheetState();
}

class _FitnessResultSheetState extends State<_FitnessResultSheet> {
  List<Map<String, dynamic>> _soldiers = [];
  List<Map<String, dynamic>> _exercises = [];
  String? _selectedSoldierId;
  Map<String, TextEditingController> _valueControllers = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final repo = ApiRepository(widget.api);
      final soldiers = await repo.getSoldiers();
      final exercises = await repo.getFitnessExercises();
      if (mounted) setState(() {
        _soldiers = soldiers.map((s) => {'id': s.id, 'name': s.name}).toList();
        _exercises = exercises;
        for (final c in _valueControllers.values) { c.dispose(); }
        _valueControllers = {};
        for (final ex in exercises) {
          _valueControllers[ex['id']] = TextEditingController();
        }
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_selectedSoldierId == null) return;
    final results = _exercises.map((ex) {
      final ctrl = _valueControllers[ex['id']];
      return {'exerciseId': ex['id'], 'value': double.tryParse(ctrl?.text ?? '') ?? 0};
    }).toList();
    try {
      final repo = ApiRepository(widget.api);
      await repo.createFitnessResult({
        'soldierId': _selectedSoldierId,
        'results': results,
      });
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('فشل حفظ نتيجة اللياقة', style: TextStyle(fontSize: 14.sp)),
          backgroundColor: const Color(AC.danger),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
        ));
      }
    }
  }

  @override
  void dispose() {
    for (final c in _valueControllers.values) { c.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 16.w, 20.w, bottomInset + 16.h),
      child: _loading
          ? SizedBox(height: 200.h, child: const Center(child: CircularProgressIndicator(color: Color(AC.gold))))
          : SingleChildScrollView(
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
                  Text('نتيجة لياقة', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                  SizedBox(height: 16.h),
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(labelText: 'الجندي', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: _soldiers.map<DropdownMenuItem<String>>((s) => DropdownMenuItem<String>(
                      value: s['id'] as String?, child: Text(s['name'] ?? '', style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) => setState(() => _selectedSoldierId = v),
                  ),
                  SizedBox(height: 12.h),
                  ..._exercises.map((ex) => Padding(
                    padding: EdgeInsets.only(bottom: 8.h),
                    child: TextField(
                      controller: _valueControllers[ex['id']],
                      decoration: InputDecoration(
                        labelText: '${ex['name']} (${ex['unit'] ?? ''})',
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                      ),
                      keyboardType: TextInputType.number,
                      style: TextStyle(fontSize: 14.sp),
                    ),
                  )),
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
                          child: Text('حفظ', style: TextStyle(fontSize: 15.sp)),
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
