import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/models/soldier_model.dart';
import '../../../data/models/result_model.dart';
import '../../../data/repositories/api_repository.dart';
import '../../widgets/score_badge.dart';

class SoldierProfileScreen extends StatefulWidget {
  final String soldierId;
  const SoldierProfileScreen({super.key, required this.soldierId});

  @override
  State<SoldierProfileScreen> createState() => _SoldierProfileScreenState();
}

class _SoldierProfileScreenState extends State<SoldierProfileScreen> {
  SoldierModel? _soldier;
  List<ResultModel> _results = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final repo = ApiRepository(context.read<ApiService>());
      final soldier = await repo.getSoldier(widget.soldierId);
      final results = await repo.getResultsList(soldierId: widget.soldierId, limit: 50);
      if (mounted) setState(() {
        _soldier = soldier;
        _results = results;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = 'فشل تحميل الملف الشخصي'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_soldier?.name ?? 'الملف الشخصي', style: TextStyle(fontSize: 18.sp)),
        actions: [
          if (_soldier != null)
            IconButton(
              icon: Icon(Icons.edit_outlined, color: const Color(AC.gold), size: 20.r),
              onPressed: () => Navigator.pop(context, 'edit'),
            ),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: const Color(AC.gold)))
          : _error != null
              ? _buildError()
              : _buildContent(),
    );
  }

  Widget _buildError() => Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.cloud_off, size: 64.r, color: const Color(AC.textSecondary)),
        SizedBox(height: 16.h),
        Text(_error!, style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
        SizedBox(height: 24.h),
        ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('إعادة المحاولة')),
      ],
    ),
  );

  Widget _buildContent() {
    final s = _soldier!;
    final lr = s.lastResult;
    return RefreshIndicator(
      color: const Color(AC.gold),
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(16.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(s),
            SizedBox(height: 16.h),
            if (s.distinctionBadge != null) _buildDistinctionCard(s),
            if (s.distinctionBadge != null) SizedBox(height: 16.h),
            _buildInfoCard(s),
            SizedBox(height: 16.h),
            if (lr != null) _buildLastResultCard(lr),
            SizedBox(height: 16.h),
            _sectionHeader('التقييمات السابقة'),
            SizedBox(height: 8.h),
            if (_results.isEmpty)
              Container(
                width: double.infinity, padding: EdgeInsets.all(32.w),
                decoration: BoxDecoration(color: const Color(AC.card), borderRadius: BorderRadius.circular(12.r), border: Border.all(color: const Color(AC.cardBorder))),
                child: Center(child: Text('لا توجد تقييمات', style: TextStyle(fontSize: 14.sp, color: const Color(AC.textSecondary)))),
              )
            else
              ..._results.map((r) => _resultCard(r)),
            SizedBox(height: 24.h),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(SoldierModel s) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(AC.card), const Color(AC.card).withOpacity(0.5)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: const Color(AC.gold).withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 64.r, height: 64.r,
            decoration: BoxDecoration(
              color: const Color(AC.gold).withOpacity(0.15),
              borderRadius: BorderRadius.circular(16.r),
              border: Border.all(color: const Color(AC.gold).withOpacity(0.3)),
            ),
            child: Center(child: Text(s.weaponIcon ?? '👤', style: TextStyle(fontSize: 28.sp))),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s.name, style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.bold, color: const Color(AC.textPrimary))),
                SizedBox(height: 4.h),
                Text(s.rankName ?? '', style: TextStyle(fontSize: 15.sp, color: const Color(AC.gold))),
                SizedBox(height: 2.h),
                Text(s.militaryId ?? '', style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDistinctionCard(SoldierModel s) {
    final badgeEmoji = s.distinctionBadge == 'gold' ? '🥇' : s.distinctionBadge == 'silver' ? '🥈' : '🥉';
    final badgeLabel = s.distinctionBadge == 'gold' ? 'ذهبي' : s.distinctionBadge == 'silver' ? 'فضي' : 'برونزي';
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [const Color(AC.gold).withOpacity(0.12), const Color(AC.card)]),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(AC.gold).withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Text(badgeEmoji, style: TextStyle(fontSize: 28.sp)),
          SizedBox(width: 12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('وسام $badgeLabel', style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
                if (s.distinctionCitation != null && s.distinctionCitation!.isNotEmpty)
                  Text(s.distinctionCitation!, style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary))),
                if (s.distinguishedByName != null)
                  Text('بواسطة: ${s.distinguishedByName}', style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(SoldierModel s) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(color: const Color(AC.card), borderRadius: BorderRadius.circular(12.r), border: Border.all(color: const Color(AC.cardBorder))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('معلومات الجندي'),
          SizedBox(height: 12.h),
          _infoRow2('السلاح', s.weaponName ?? '-'),
          _infoRow2('التخصص العام', s.specialtyName ?? '-'),
          _infoRow2('التخصص الدقيق', s.specificSpecialty ?? '-'),
          _infoRow2('ملاحظات', s.notes ?? '-'),
        ],
      ),
    );
  }

  Widget _buildLastResultCard(Map<String, dynamic> lr) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: const Color(AC.card),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: const Color(AC.success).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('آخر تقييم'),
          SizedBox(height: 12.h),
          Row(
            children: [
              _scoreBox('اللياقة', lr['fitness_score'], const Color(0xFF4FC3F7)),
              SizedBox(width: 8.w),
              _scoreBox('التخصص', lr['specialty_score'], const Color(AC.gold)),
              SizedBox(width: 8.w),
              _scoreBox('الانضباط', lr['discipline_score'], const Color(0xFF66BB6A)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) => Row(
    children: [
      Container(width: 3.w, height: 16.h, color: const Color(AC.gold)),
      SizedBox(width: 8.w),
      Text(title, style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold))),
    ],
  );

  Widget _infoRow2(String label, String value) => Padding(
    padding: EdgeInsets.symmetric(vertical: 3.h),
    child: Row(
      children: [
        SizedBox(width: 90.w, child: Text(label, style: TextStyle(fontSize: 13.sp, color: const Color(AC.textSecondary)))),
        Expanded(child: Text(value, style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary), fontWeight: FontWeight.w500))),
      ],
    ),
  );

  Widget _scoreBox(String label, dynamic score, Color color) {
    final val = score is num ? score.toDouble() : null;
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(12.w),
        decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(10.r), border: Border.all(color: color.withOpacity(0.2))),
        child: Column(
          children: [
            Text(val?.toStringAsFixed(0) ?? '—', style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.bold, color: color)),
            SizedBox(height: 4.h),
            Text(label, style: TextStyle(fontSize: 11.sp, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _resultCard(ResultModel r) {
    return Container(
      margin: EdgeInsets.only(bottom: 8.h),
      padding: EdgeInsets.all(14.w),
      decoration: BoxDecoration(color: const Color(AC.card), borderRadius: BorderRadius.circular(12.r), border: Border.all(color: const Color(AC.cardBorder))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(r.examTitle ?? 'تقييم', style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
              ),
              Text(r.formattedDate, style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary))),
              SizedBox(width: 8.w),
              if (r.totalScore != null) ScoreBadge(score: r.totalScore!),
            ],
          ),
          SizedBox(height: 8.h),
          Row(
            children: [
              if (r.fitnessScore != null) _miniBadge('ل ${r.fitnessScore!.toInt()}', const Color(0xFF4FC3F7)),
              if (r.specialtyScore != null) _miniBadge('ت ${r.specialtyScore!.toInt()}', const Color(AC.gold)),
              if (r.disciplineScore != null) _miniBadge('د ${r.disciplineScore!.toInt()}', const Color(0xFF66BB6A)),
              if (r.enteredByName != null) ...[
                SizedBox(width: 8.w),
                Text(r.enteredByName!, style: TextStyle(fontSize: 11.sp, color: const Color(AC.textSecondary))),
              ],
            ],
          ),
          if (r.notes != null && r.notes!.isNotEmpty) ...[
            SizedBox(height: 4.h),
            Text(r.notes!, style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary))),
          ],
        ],
      ),
    );
  }

  Widget _miniBadge(String text, Color color) => Container(
    margin: EdgeInsets.only(left: 4.w),
    padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
    decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(4.r), border: Border.all(color: color.withOpacity(0.3))),
    child: Text(text, style: TextStyle(fontSize: 10.sp, color: color, fontWeight: FontWeight.w600)),
  );
}
