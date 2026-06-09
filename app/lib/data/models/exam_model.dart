class ExamModel {
  final String id;
  final String title;
  final String type;
  final String? weaponId;
  final String? weaponName;
  final String? weaponIcon;
  final String? specialtyId;
  final String? specialtyName;
  final int itemCount;
  final int resultCount;
  final double? avgScore;
  final List<ExamItem>? items;

  ExamModel({
    required this.id,
    required this.title,
    required this.type,
    this.weaponId,
    this.weaponName,
    this.weaponIcon,
    this.specialtyId,
    this.specialtyName,
    this.itemCount = 0,
    this.resultCount = 0,
    this.avgScore,
    this.items,
  });

  factory ExamModel.fromJson(Map<String, dynamic> json) => ExamModel(
    id: json['id'] ?? '',
    title: json['title'] ?? '',
    type: json['type'] ?? 'general',
    weaponId: json['weapon_id'],
    weaponName: json['weapon_name'],
    weaponIcon: json['weapon_icon'],
    specialtyId: json['specialty_id'],
    specialtyName: json['specialty_name'],
    itemCount: json['item_count'] ?? 0,
    resultCount: json['result_count'] ?? 0,
    avgScore: json['avg_score']?.toDouble(),
    items: (json['items'] as List?)
        ?.map((e) => ExamItem.fromJson(e)).toList(),
  );
}

class ExamItem {
  final String id;
  final String text;
  final double maxScore;
  final int sortOrder;

  ExamItem({
    required this.id,
    required this.text,
    this.maxScore = 10,
    this.sortOrder = 0,
  });

  factory ExamItem.fromJson(Map<String, dynamic> json) => ExamItem(
    id: json['id'] ?? '',
    text: json['text'] ?? '',
    maxScore: (json['max_score'] ?? 10).toDouble(),
    sortOrder: json['sort_order'] ?? 0,
  );
}
