class UserModel {
  final String id;
  final String name;
  final String username;
  final String role;

  UserModel({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    username: json['username'] ?? '',
    role: json['role'] ?? 'officer',
  );
}
