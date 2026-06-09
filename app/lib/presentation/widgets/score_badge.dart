import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_constants.dart';

class ScoreBadge extends StatelessWidget {
  final double score;
  final double? fontSize;

  const ScoreBadge({super.key, required this.score, this.fontSize});

  Color get _color {
    if (score >= 90) return const Color(0xFF1B8A2E);
    if (score >= 75) return const Color(0xFF2D6A4F);
    if (score >= 65) return const Color(AC.gold);
    if (score >= 50) return const Color(AC.warning);
    return const Color(AC.danger);
  }

  String get _label {
    if (score >= 90) return 'ممتاز';
    if (score >= 75) return 'جيد جداً';
    if (score >= 65) return 'جيد';
    if (score >= 50) return 'مقبول';
    return 'راسب';
  }

  @override
  Widget build(BuildContext context) {
    final fs = fontSize ?? 11.sp;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8.r),
        border: Border.all(color: _color.withOpacity(0.5), width: 1),
      ),
      child: Text(
        '$_label ${score.toStringAsFixed(1)}%',
        style: TextStyle(color: _color, fontSize: fs, fontWeight: FontWeight.bold),
      ),
    );
  }
}
