import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';

class ScoreBadge extends StatelessWidget {
  final double score;
  final double fontSize;
  const ScoreBadge({super.key, required this.score, this.fontSize = 14});

  Color get _color {
    if (score >= 90) return const Color(0xFF1B8A2E);
    if (score >= 75) return const Color(0xFF2D6A4F);
    if (score >= 65) return const Color(AC.gold);
    if (score >= 50) return const Color(AC.warning);
    return const Color(AC.danger);
  }

  String get _label {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Acceptable';
    return 'Fail';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _color.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_label, style: TextStyle(color: _color, fontSize: fontSize)),
          const SizedBox(width: 6),
          Text('${score.toStringAsFixed(1)}%', style: TextStyle(
            color: _color, fontSize: fontSize, fontWeight: FontWeight.bold,
          )),
        ],
      ),
    );
  }
}
