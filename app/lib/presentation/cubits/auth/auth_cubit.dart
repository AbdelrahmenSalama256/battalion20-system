import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/user_model.dart';

class AuthCubit extends Cubit<AuthState> {
  final ApiRepository _repo;

  AuthCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(AuthInitial());

  Future<void> login(String username, String password) async {
    emit(AuthLoading());
    try {
      final user = await _repo.login(username, password);
      emit(AuthAuthenticated(user));
    } catch (e) {
      final msg = e.toString().contains('401')
          ? 'Invalid username or password'
          : 'Connection failed';
      emit(AuthError(msg));
    }
  }

  Future<void> checkAuth() async {
    emit(AuthLoading());
    try {
      final user = await _repo.getMe();
      emit(AuthAuthenticated(user));
    } catch (_) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    emit(AuthUnauthenticated());
  }

  void updateUser(UserModel updated) {
    final s = state;
    if (s is AuthAuthenticated) {
      emit(AuthAuthenticated(updated));
    }
  }
}

sealed class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

final class AuthInitial extends AuthState {
  const AuthInitial();
}

final class AuthLoading extends AuthState {
  const AuthLoading();
}

final class AuthAuthenticated extends AuthState {
  final UserModel user;
  const AuthAuthenticated(this.user);
  @override
  List<Object?> get props => [user];
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

final class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
  @override
  List<Object?> get props => [message];
}
