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

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
    totalSoldiers: json['totalSoldiers'] ?? json['total_soldiers'] ?? 0,
    totalResults: json['totalResults'] ?? json['total_results'] ?? 0,
    avgScore: ((json['avgScore'] ?? json['avg_score'] ?? 0) as num).toDouble(),
    passRate: ((json['passRate'] ?? json['pass_rate'] ?? 0) as num).toDouble(),
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
    count: json['count'] ?? 0,
    avg: (json['avg'] ?? 0).toDouble(),
    passRate: (json['pass_rate'] ?? 0).toDouble(),
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
    totalScore: (json['total_score'] ?? 0).toDouble(),
    examDate: json['exam_date'] ?? '',
  );
}
