import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/soldier_model.dart';

sealed class SoldiersState extends Equatable {
  const SoldiersState();
  @override
  List<Object?> get props => [];
}

final class SoldiersInitial extends SoldiersState {
  const SoldiersInitial();
}

final class SoldiersLoading extends SoldiersState {
  const SoldiersLoading();
}

final class SoldiersLoaded extends SoldiersState {
  final List<SoldierModel> soldiers;
  const SoldiersLoaded(this.soldiers);
  @override
  List<Object?> get props => [soldiers];
}

final class SoldiersError extends SoldiersState {
  final String message;
  const SoldiersError(this.message);
  @override
  List<Object?> get props => [message];
}

class SoldiersCubit extends Cubit<SoldiersState> {
  final ApiRepository _repo;

  SoldiersCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(SoldiersInitial());

  Future<void> loadSoldiers({
    String? search,
    String? weaponId,
    String? specialtyId,
  }) async {
    emit(SoldiersLoading());
    try {
      final soldiers = await _repo.getSoldiers(
        search: search,
        weaponId: weaponId,
        specialtyId: specialtyId,
      );
      emit(SoldiersLoaded(soldiers));
    } catch (e) {
      emit(SoldiersError('Failed to load soldiers'));
    }
  }

  Future<void> createSoldier(Map<String, dynamic> data) async {
    try {
      await _repo.createSoldier(data);
      await loadSoldiers();
    } catch (e) {
      emit(SoldiersError('Failed to create soldier'));
    }
  }

  Future<void> updateSoldier(String id, Map<String, dynamic> data) async {
    try {
      await _repo.updateSoldier(id, data);
      await loadSoldiers();
    } catch (e) {
      emit(SoldiersError('Failed to update soldier'));
    }
  }

  Future<void> deleteSoldier(String id) async {
    try {
      await _repo.deleteSoldier(id);
      await loadSoldiers();
    } catch (e) {
      emit(SoldiersError('Failed to delete soldier'));
    }
  }
}
