class ResultModel {
  final String id;
  final String soldierId;
  final String? soldierName;
  final String? militaryId;
  final String? examId;
  final String? examTitle;
  final String? examType;
  final String? enteredByName;
  final double? fitnessScore;
  final double? specialtyScore;
  final double? disciplineScore;
  final double? totalScore;
  final String? notes;
  final String? createdAt;
  final String? examDate;

  ResultModel({
    required this.id,
    required this.soldierId,
    this.soldierName,
    this.militaryId,
    this.examId,
    this.examTitle,
    this.examType,
    this.enteredByName,
    this.fitnessScore,
    this.specialtyScore,
    this.disciplineScore,
    this.totalScore,
    this.notes,
    this.createdAt,
    this.examDate,
  });

  factory ResultModel.fromJson(Map<String, dynamic> json) => ResultModel(
        id: json['id'] ?? '',
        soldierId: json['soldier_id'] ?? '',
        soldierName: json['soldier_name'],
        militaryId: json['military_id'],
        examId: json['exam_id'],
        examTitle: json['exam_title'],
        examType: json['exam_type'],
        enteredByName: json['entered_by_name'],
        fitnessScore: _toDouble(json['fitness_score']),
        specialtyScore: _toDouble(json['specialty_score']),
        disciplineScore: _toDouble(json['discipline_score']),
        totalScore: _toDouble(json['total_score']),
        notes: json['notes'],
        createdAt: json['created_at'],
        examDate: json['exam_date'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'soldier_id': soldierId,
        'fitness_score': fitnessScore,
        'specialty_score': specialtyScore,
        'discipline_score': disciplineScore,
        'total_score': totalScore,
        'notes': notes,
      };

  String get formattedDate =>
      createdAt != null && createdAt!.length >= 10 ? createdAt!.substring(0, 10) : '—';

  static double? _toDouble(dynamic v) =>
      v is double ? v : (v is num ? v.toDouble() : null);
}
