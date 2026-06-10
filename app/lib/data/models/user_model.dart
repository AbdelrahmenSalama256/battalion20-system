class UserModel {
  final String id;
  final String name;
  final String username;
  final String role;
  final bool isActive;
  final String? rankName;
  final String? avatarUrl;
  final Map<String, dynamic>? permissions;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
    this.isActive = true,
    this.rankName,
    this.avatarUrl,
    this.permissions,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        username: json['username'] ?? '',
        role: json['role'] ?? 'officer',
        isActive: json['is_active'] ?? true,
        rankName: json['rank_name'],
        avatarUrl: json['avatar_url'],
        permissions: json['permissions'] is Map ? json['permissions'] as Map<String, dynamic> : null,
        createdAt: json['created_at'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'username': username,
        'role': role,
        'is_active': isActive,
        'rank_name': rankName,
        'avatar_url': avatarUrl,
        'permissions': permissions,
      };

  String get roleLabel => role == 'commander' ? 'قائد' : role == 'officer' ? 'ضابط' : 'صف ضابط';
}
