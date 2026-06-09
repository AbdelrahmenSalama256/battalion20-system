class DashboardStats {
  final int totalSoldiers;
  final int totalResults;
  final double avgScore;
  final double passRate;
  final List<WeaponStat> byWeapon;
  final ScoreDistribution distribution;
  final List<RecentResult> recentResults;

  DashboardStats({
    required this.totalSoldiers,
    required this.totalResults,
    required this.avgScore,
    required this.passRate,
    required this.byWeapon,
    required this.distribution,
    required this.recentResults,
  });

  static int _toInt(dynamic v) => v is int ? v : (v is String ? int.tryParse(v) ?? 0 : 0);
  static double _toDouble(dynamic v) => v is double ? v : (v is num ? v.toDouble() : (v is String ? double.tryParse(v) ?? 0 : 0));

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
    totalSoldiers: _toInt(json['totalSoldiers'] ?? json['total_soldiers']),
    totalResults: _toInt(json['totalResults'] ?? json['total_results']),
    avgScore: _toDouble(json['avgScore'] ?? json['avg_score']),
    passRate: _toDouble(json['passRate'] ?? json['pass_rate']),
    byWeapon: ((json['byWeapon'] ?? json['by_weapon']) as List? ?? [])
        .map((e) => WeaponStat.fromJson(e)).toList(),
    distribution: ScoreDistribution.fromJson(json['distribution'] ?? {}),
    recentResults: ((json['recentResults'] ?? json['recent_results']) as List? ?? [])
        .map((e) => RecentResult.fromJson(e)).toList(),
  );
}

class WeaponStat {
  final String weaponName;
  final String weaponIcon;
  final int count;
  final double avg;
  final double passRate;

  WeaponStat({
    required this.weaponName,
    required this.weaponIcon,
    required this.count,
    required this.avg,
    required this.passRate,
  });

  factory WeaponStat.fromJson(Map<String, dynamic> json) => WeaponStat(
    weaponName: json['weapon_name'] ?? '',
    weaponIcon: json['weapon_icon'] ?? '⚔️',
    count: _toInt(json['count']),
    avg: _toDouble(json['avg']),
    passRate: _toDouble(json['pass_rate']),
  );
}

class ScoreDistribution {
  final int excellent;
  final int veryGood;
  final int good;
  final int acceptable;
  final int fail;

  ScoreDistribution({
    required this.excellent,
    required this.veryGood,
    required this.good,
    required this.acceptable,
    required this.fail,
  });

  factory ScoreDistribution.fromJson(Map<String, dynamic> json) =>
      ScoreDistribution(
        excellent: json['excellent'] ?? 0,
        veryGood: json['veryGood'] ?? json['very_good'] ?? 0,
        good: json['good'] ?? 0,
        acceptable: json['acceptable'] ?? 0,
        fail: json['fail'] ?? 0,
      );
}

class RecentResult {
  final String id;
  final String soldierName;
  final String? militaryId;
  final String? examTitle;
  final double totalScore;
  final String examDate;

  RecentResult({
    required this.id,
    required this.soldierName,
    this.militaryId,
    this.examTitle,
    required this.totalScore,
    required this.examDate,
  });

  factory RecentResult.fromJson(Map<String, dynamic> json) => RecentResult(
    id: json['id'] ?? '',
    soldierName: json['soldier_name'] ?? '',
    militaryId: json['military_id'],
    examTitle: json['exam_title'],
    totalScore: _toDouble(json['total_score']),
    examDate: json['exam_date'] ?? '',
  );
}
