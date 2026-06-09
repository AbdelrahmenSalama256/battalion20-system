import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/exam_model.dart';
import '../../widgets/score_badge.dart';

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({super.key});

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  String? _typeFilter;
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final repo = ApiRepository(api);
      final data = await repo.getResults(type: _typeFilter);
      if (mounted) setState(() => _results = List<Map<String, dynamic>>.from(data['results']));
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _showEnterResult() {
    final api = context.read<ApiService>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AC.card),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) => _EnterResultSheet(api: api, onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.all(12.w),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _typeFilter,
                  decoration: InputDecoration(
                    labelText: 'النوع',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                  ),
                  dropdownColor: const Color(AC.card),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('الكل', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'exam', child: Text('امتحان', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'fitness', child: Text('لياقة', style: TextStyle(fontSize: 14))),
                  ],
                  onChanged: (v) { setState(() => _typeFilter = v); _load(); },
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
                  onPressed: _showEnterResult,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(AC.gold)))
              : _results.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.grading_outlined, size: 64.r, color: const Color(AC.textSecondary)),
                          SizedBox(height: 12.h),
                          Text('لا توجد نتائج', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      color: const Color(AC.gold),
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
                        itemCount: _results.length,
                        itemBuilder: (ctx, i) {
                          final r = _results[i];
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
                                    child: Icon(Icons.person, color: const Color(AC.gold), size: 22.r),
                                  ),
                                  SizedBox(width: 12.w),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(r['soldier_name'] ?? '', style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
                                        SizedBox(height: 2.h),
                                        Text(
                                          '${r['exam_title'] ?? ''} • ${r['exam_date'] ?? ''}',
                                          style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  ScoreBadge(score: (r['total_score'] ?? 0).toDouble()),
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
  }
}

class _EnterResultSheet extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;
  const _EnterResultSheet({required this.api, required this.onSaved});

  @override
  State<_EnterResultSheet> createState() => _EnterResultSheetState();
}

class _EnterResultSheetState extends State<_EnterResultSheet> {
  List<Map<String, dynamic>> _soldiers = [];
  List<ExamModel> _exams = [];
  List<ExamItem> _items = [];
  String? _selectedSoldierId;
  String? _selectedExamId;
  Map<String, TextEditingController> _scoreControllers = {};
  bool _loading = true;
  double _totalScore = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final repo = ApiRepository(widget.api);
      final soldiers = await repo.getSoldiers();
      final exams = await repo.getExams();
      if (mounted) setState(() {
        _soldiers = soldiers.map((s) => {'id': s.id, 'name': s.name, 'militaryId': s.militaryId}).toList();
        _exams = exams;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadExamItems(String examId) async {
    try {
      final repo = ApiRepository(widget.api);
      final exam = await repo.getExam(examId);
      if (mounted) setState(() {
        _items = exam.items ?? [];
        for (final c in _scoreControllers.values) { c.dispose(); }
        _scoreControllers = {};
        for (final item in _items) {
          _scoreControllers[item.id] = TextEditingController();
        }
        _calculateTotal();
      });
    } catch (_) {}
  }

  void _calculateTotal() {
    double totalGot = 0, totalMax = 0;
    for (final item in _items) {
      final ctrl = _scoreControllers[item.id];
      final val = double.tryParse(ctrl?.text ?? '') ?? 0;
      totalGot += val;
      totalMax += item.maxScore;
    }
    setState(() => _totalScore = totalMax > 0 ? (totalGot / totalMax) * 100 : 0);
  }

  Future<void> _save() async {
    if (_selectedSoldierId == null || _selectedExamId == null) return;
    final scores = _items.map((item) {
      final ctrl = _scoreControllers[item.id];
      return {'itemId': item.id, 'value': double.tryParse(ctrl?.text ?? '') ?? 0};
    }).toList();
    try {
      final repo = ApiRepository(widget.api);
      await repo.createResult({
        'examId': _selectedExamId,
        'soldierId': _selectedSoldierId,
        'scores': scores,
      });
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('فشل حفظ النتيجة', style: TextStyle(fontSize: 14.sp)),
          backgroundColor: const Color(AC.danger),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
        ));
      }
    }
  }

  @override
  void dispose() {
    for (final c in _scoreControllers.values) { c.dispose(); }
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
                  Text('إضافة نتيجة', style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                  SizedBox(height: 16.h),
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(labelText: 'الجندي', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: _soldiers.map<DropdownMenuItem<String>>((s) => DropdownMenuItem<String>(
                      value: s['id'] as String?, child: Text('${s['name']} (${s['militaryId'] ?? ''})', style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) => setState(() => _selectedSoldierId = v),
                  ),
                  SizedBox(height: 12.h),
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(labelText: 'الامتحان', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: _exams.map<DropdownMenuItem<String>>((e) => DropdownMenuItem<String>(
                      value: e.id, child: Text(e.title, style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) { setState(() => _selectedExamId = v); _loadExamItems(v!); },
                  ),
                  if (_items.isNotEmpty) ...[
                    SizedBox(height: 16.h),
                    ..._items.map((item) => Padding(
                      padding: EdgeInsets.only(bottom: 8.h),
                      child: TextField(
                        controller: _scoreControllers[item.id],
                        decoration: InputDecoration(
                          labelText: '${item.text} (القصوى: ${item.maxScore})',
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                        ),
                        keyboardType: TextInputType.number,
                        style: TextStyle(fontSize: 14.sp),
                        onChanged: (_) => _calculateTotal(),
                      ),
                    )),
                    SizedBox(height: 8.h),
                    Container(
                      padding: EdgeInsets.all(12.w),
                      decoration: BoxDecoration(
                        color: const Color(AC.gold).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8.r),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('المجموع:', style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.bold, color: const Color(AC.textPrimary))),
                          ScoreBadge(score: _totalScore),
                        ],
                      ),
                    ),
                  ],
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
