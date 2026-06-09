import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/dashboard_stats_model.dart';

sealed class DashboardState extends Equatable {
  const DashboardState();
  @override
  List<Object?> get props => [];
}

final class DashboardInitial extends DashboardState {
  const DashboardInitial();
}

final class DashboardLoading extends DashboardState {
  const DashboardLoading();
}

final class DashboardLoaded extends DashboardState {
  final DashboardStats stats;
  const DashboardLoaded(this.stats);
  @override
  List<Object?> get props => [stats];
}

final class DashboardError extends DashboardState {
  final String message;
  const DashboardError(this.message);
  @override
  List<Object?> get props => [message];
}

class DashboardCubit extends Cubit<DashboardState> {
  final ApiRepository _repo;

  DashboardCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(DashboardInitial());

  Future<void> loadStats() async {
    emit(DashboardLoading());
    try {
      final stats = await _repo.getStats();
      emit(DashboardLoaded(stats));
    } catch (e) {
      emit(DashboardError('Failed to load stats'));
    }
  }
}
