import '../../core/network/api_service.dart';
import '../models/user_model.dart';
import '../models/dashboard_stats_model.dart';
import '../models/soldier_model.dart';
import '../models/exam_model.dart';

class ApiRepository {
  final ApiService _api;

  ApiRepository(this._api);

  Future<UserModel> login(String username, String password) async {
    final res = await _api.post('/auth/login', data: {
      'username': username,
      'password': password,
    });
    await _api.saveToken(res.data['token']);
    return UserModel.fromJson(res.data['user']);
  }

  Future<void> logout() => _api.clearToken();

  Future<UserModel> getMe() async {
    final res = await _api.get('/auth/me');
    return UserModel.fromJson(res.data);
  }

  Future<DashboardStats> getStats() async {
    final res = await _api.get('/results/stats');
    return DashboardStats.fromJson(res.data);
  }

  Future<List<SoldierModel>> getSoldiers({
    String? search,
    String? weaponId,
    String? specialtyId,
  }) async {
    final params = <String, dynamic>{};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (weaponId != null) params['weaponId'] = weaponId;
    if (specialtyId != null) params['specialtyId'] = specialtyId;
    final res = await _api.get('/soldiers', params: params);
    return (res.data as List).map((e) => SoldierModel.fromJson(e)).toList();
  }

  Future<SoldierModel> getSoldier(String id) async {
    final res = await _api.get('/soldiers/$id');
    return SoldierModel.fromJson(res.data);
  }

  Future<void> createSoldier(Map<String, dynamic> data) async {
    await _api.post('/soldiers', data: data);
  }

  Future<void> updateSoldier(String id, Map<String, dynamic> data) async {
    await _api.put('/soldiers/$id', data: data);
  }

  Future<void> deleteSoldier(String id) async {
    await _api.delete('/soldiers/$id');
  }

  Future<List<Map<String, dynamic>>> getWeapons() async {
    final res = await _api.get('/weapons');
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<List<Map<String, dynamic>>> getSpecialties({String? weaponId}) async {
    final params = <String, dynamic>{};
    if (weaponId != null) params['weaponId'] = weaponId;
    final res = await _api.get('/specialties', params: params);
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<List<Map<String, dynamic>>> getRanks({String? typeId}) async {
    final params = <String, dynamic>{};
    if (typeId != null) params['typeId'] = typeId;
    final res = await _api.get('/ranks', params: params);
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<List<Map<String, dynamic>>> getRankTypes() async {
    final res = await _api.get('/ranks/types');
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<List<ExamModel>> getExams({String? type, String? weaponId}) async {
    final params = <String, dynamic>{};
    if (type != null) params['type'] = type;
    if (weaponId != null) params['weaponId'] = weaponId;
    final res = await _api.get('/exams', params: params);
    return (res.data as List).map((e) => ExamModel.fromJson(e)).toList();
  }

  Future<ExamModel> getExam(String id) async {
    final res = await _api.get('/exams/$id');
    return ExamModel.fromJson(res.data);
  }

  Future<void> createExam(Map<String, dynamic> data) async {
    await _api.post('/exams', data: data);
  }

  Future<void> updateExam(String id, Map<String, dynamic> data) async {
    await _api.put('/exams/$id', data: data);
  }

  Future<void> deleteExam(String id) async {
    await _api.delete('/exams/$id');
  }

  Future<Map<String, dynamic>> getResults({
    String? type, String? weaponId, String? soldierId,
    int page = 1, int limit = 30,
  }) async {
    final params = <String, dynamic>{
      'page': page, 'limit': limit,
    };
    if (type != null) params['type'] = type;
    if (weaponId != null) params['weaponId'] = weaponId;
    if (soldierId != null) params['soldierId'] = soldierId;
    final res = await _api.get('/results', params: params);
    return res.data;
  }

  Future<void> createResult(Map<String, dynamic> data) async {
    await _api.post('/results', data: data);
  }

  Future<void> deleteResult(String id) async {
    await _api.delete('/results/$id');
  }

  Future<List<Map<String, dynamic>>> getFitnessExercises() async {
    final res = await _api.get('/fitness/exercises');
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<void> createFitnessResult(Map<String, dynamic> data) async {
    await _api.post('/fitness/results', data: data);
  }

  Future<List<Map<String, dynamic>>> getAnnouncements() async {
    final res = await _api.get('/announcements');
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<void> createAnnouncement(Map<String, dynamic> data) async {
    await _api.post('/announcements', data: data);
  }

  Future<void> deleteAnnouncement(String id) async {
    await _api.delete('/announcements/$id');
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _api.patch('/auth/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  // Notifications
  Future<List<Map<String, dynamic>>> getNotifications() async {
    final res = await _api.get('/notifications');
    return List<Map<String, dynamic>>.from(res.data);
  }

  Future<void> markNotificationRead(String id) async {
    await _api.patch('/notifications/$id/read');
  }

  Future<void> markAllNotificationsRead() async {
    await _api.patch('/notifications/read-all');
  }

  Future<int> getUnreadCount() async {
    final res = await _api.get('/notifications/unread-count');
    return (res.data['count'] as num).toInt();
  }

  // Users
  Future<List<UserModel>> getUsers() async {
    final res = await _api.get('/users');
    return (res.data as List).map((e) => UserModel.fromJson(e)).toList();
  }

  Future<void> createUser(Map<String, dynamic> data) async {
    await _api.post('/users', data: data);
  }

  Future<void> updateUserPassword(String id, String password) async {
    await _api.patch('/users/$id/password', data: {'password': password});
  }

  Future<void> toggleUser(String id) async {
    await _api.patch('/users/$id/toggle');
  }

  Future<void> deleteUser(String id) async {
    await _api.delete('/users/$id');
  }

  Future<void> updateUserPermissions(String id, Map<String, dynamic> permissions) async {
    await _api.patch('/users/$id/permissions', data: {'permissions': permissions});
  }

  // Distinctions
  Future<void> distinguishSoldier(String id, String badge, String citation) async {
    await _api.post('/soldiers/$id/distinguish', data: {'badge': badge, 'citation': citation});
  }

  Future<void> removeDistinction(String id) async {
    await _api.delete('/soldiers/$id/distinguish');
  }

  // Profile update
  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    final res = await _api.patch('/auth/profile', data: data);
    return UserModel.fromJson(res.data);
  }

  // Weapons / Specialties management
  Future<void> createWeapon(Map<String, dynamic> data) async {
    await _api.post('/weapons', data: data);
  }

  Future<void> deleteWeapon(String id) async {
    await _api.delete('/weapons/$id');
  }

  Future<void> createSpecialty(Map<String, dynamic> data) async {
    await _api.post('/specialties', data: data);
  }

  Future<void> deleteSpecialty(String id) async {
    await _api.delete('/specialties/$id');
  }

  Future<void> seedDemoData() async {
    await _api.post('/admin/seed');
  }
}
