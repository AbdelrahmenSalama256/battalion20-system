import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/user_model.dart';

part 'users_state.dart';

class UsersCubit extends Cubit<UsersState> {
  final ApiRepository _repo;

  UsersCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(UsersInitial());

  Future<void> loadUsers() async {
    emit(UsersLoading());
    try {
      final users = await _repo.getUsers();
      emit(UsersLoaded(users));
    } catch (e) {
      emit(UsersError('فشل تحميل المستخدمين'));
    }
  }

  Future<void> createUser(Map<String, dynamic> data) async {
    try {
      await _repo.createUser(data);
      await loadUsers();
    } catch (e) {
      emit(UsersError('فشل إنشاء المستخدم'));
      rethrow;
    }
  }

  Future<void> updatePassword(String id, String password) async {
    try {
      await _repo.updateUserPassword(id, password);
      await loadUsers();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> toggleUser(String id) async {
    try {
      await _repo.toggleUser(id);
      await loadUsers();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteUser(String id) async {
    try {
      await _repo.deleteUser(id);
      await loadUsers();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updatePermissions(String id, Map<String, dynamic> permissions) async {
    try {
      await _repo.updateUserPermissions(id, permissions);
      await loadUsers();
    } catch (e) {
      rethrow;
    }
  }
}
