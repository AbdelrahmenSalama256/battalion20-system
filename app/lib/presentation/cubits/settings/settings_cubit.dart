import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

sealed class SettingsState extends Equatable {
  const SettingsState();
  @override
  List<Object?> get props => [];
}

final class SettingsInitial extends SettingsState {
  const SettingsInitial();
}

final class SettingsLoading extends SettingsState {
  const SettingsLoading();
}

final class SettingsPasswordChanged extends SettingsState {
  final String message;
  const SettingsPasswordChanged(this.message);
  @override
  List<Object?> get props => [message];
}

final class SettingsError extends SettingsState {
  final String message;
  const SettingsError(this.message);
  @override
  List<Object?> get props => [message];
}

class SettingsCubit extends Cubit<SettingsState> {
  final ApiRepository _repo;

  SettingsCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(SettingsInitial());

  Future<void> changePassword(String oldPassword, String newPassword) async {
    emit(SettingsLoading());
    try {
      await _repo.changePassword(oldPassword, newPassword);
      emit(const SettingsPasswordChanged('تم تغيير كلمة المرور بنجاح'));
    } catch (e) {
      final msg = e.toString().contains('400')
          ? 'كلمة المرور القديمة غير صحيحة'
          : 'فشل تغيير كلمة المرور';
      emit(SettingsError(msg));
    }
  }
}
