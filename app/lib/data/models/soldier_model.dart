class SoldierModel {
  final String id;
  final String name;
  final String? militaryId;
  final String? rankId;
  final String? rankName;
  final String? rankTypeName;
  final String? rankTypeColor;
  final String? weaponId;
  final String? weaponName;
  final String? weaponIcon;
  final String? weaponColor;
  final String? specialtyId;
  final String? specialtyName;
  final String? notes;

  SoldierModel({
    required this.id,
    required this.name,
    this.militaryId,
    this.rankId,
    this.rankName,
    this.rankTypeName,
    this.rankTypeColor,
    this.weaponId,
    this.weaponName,
    this.weaponIcon,
    this.weaponColor,
    this.specialtyId,
    this.specialtyName,
    this.notes,
  });

  factory SoldierModel.fromJson(Map<String, dynamic> json) => SoldierModel(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    militaryId: json['military_id'],
    rankId: json['rank_id'],
    rankName: json['rank_name'],
    rankTypeName: json['rank_type_name'],
    rankTypeColor: json['rank_type_color'],
    weaponId: json['weapon_id'],
    weaponName: json['weapon_name'],
    weaponIcon: json['weapon_icon'],
    weaponColor: json['weapon_color'],
    specialtyId: json['specialty_id'],
    specialtyName: json['specialty_name'],
    notes: json['notes'],
  );

  Map<String, dynamic> toJson() => {
    'name': name,
    'militaryId': militaryId,
    'rankId': rankId,
    'weaponId': weaponId,
    'specialtyId': specialtyId,
    'notes': notes,
  };
}
