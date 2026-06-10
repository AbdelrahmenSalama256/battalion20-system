class NotificationModel {
  final String id;
  final String type;
  final String message;
  final String? evaluatorId;
  final String? evaluatorName;
  final String? evaluatorRank;
  final String? evaluatedId;
  final String? evaluatedName;
  final String? evaluatedRank;
  final String? evaluatedSpecialty;
  final double? fitnessScore;
  final double? specialtyScore;
  final double? disciplineScore;
  final double? totalScore;
  final bool isRead;
  final String? createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.message,
    this.evaluatorId,
    this.evaluatorName,
    this.evaluatorRank,
    this.evaluatedId,
    this.evaluatedName,
    this.evaluatedRank,
    this.evaluatedSpecialty,
    this.fitnessScore,
    this.specialtyScore,
    this.disciplineScore,
    this.totalScore,
    this.isRead = false,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      NotificationModel(
        id: json['id'] ?? '',
        type: json['type'] ?? 'evaluation',
        message: json['message'] ?? '',
        evaluatorId: json['evaluator_id'],
        evaluatorName: json['evaluator_name'],
        evaluatorRank: json['evaluator_rank'],
        evaluatedId: json['evaluated_id'],
        evaluatedName: json['evaluated_name'],
        evaluatedRank: json['evaluated_rank'],
        evaluatedSpecialty: json['evaluated_specialty'],
        fitnessScore: _toDouble(json['fitness_score']),
        specialtyScore: _toDouble(json['specialty_score']),
        disciplineScore: _toDouble(json['discipline_score']),
        totalScore: _toDouble(json['total_score']),
        isRead: json['is_read'] ?? false,
        createdAt: json['created_at'],
      );

  static double? _toDouble(dynamic v) =>
      v is double ? v : (v is num ? v.toDouble() : null);
}
