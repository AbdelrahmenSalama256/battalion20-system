part of 'users_cubit.dart';

sealed class UsersState extends Equatable {
  const UsersState();
  @override
  List<Object?> get props => [];
}

final class UsersInitial extends UsersState {
  const UsersInitial();
}

final class UsersLoading extends UsersState {
  const UsersLoading();
}

final class UsersLoaded extends UsersState {
  final List<UserModel> users;
  const UsersLoaded(this.users);
  @override
  List<Object?> get props => [users];
}

final class UsersError extends UsersState {
  final String message;
  const UsersError(this.message);
  @override
  List<Object?> get props => [message];
}
