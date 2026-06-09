import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

sealed class ResultsState extends Equatable {
  const ResultsState();
  @override
  List<Object?> get props => [];
}

final class ResultsInitial extends ResultsState {
  const ResultsInitial();
}

final class ResultsLoading extends ResultsState {
  const ResultsLoading();
}

final class ResultsLoaded extends ResultsState {
  final List results;
  final int total;
  final int page;
  const ResultsLoaded({
    required this.results,
    required this.total,
    required this.page,
  });
  @override
  List<Object?> get props => [results, total, page];
}

final class ResultsError extends ResultsState {
  final String message;
  const ResultsError(this.message);
  @override
  List<Object?> get props => [message];
}

class ResultsCubit extends Cubit<ResultsState> {
  final ApiRepository _repo;

  ResultsCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(ResultsInitial());

  Future<void> loadResults({
    String? type,
    String? weaponId,
    String? soldierId,
    int page = 1,
  }) async {
    emit(ResultsLoading());
    try {
      final data = await _repo.getResults(
        type: type,
        weaponId: weaponId,
        soldierId: soldierId,
        page: page,
      );
      emit(ResultsLoaded(
        results: data['results'] as List,
        total: data['total'] ?? 0,
        page: data['page'] ?? 1,
      ));
    } catch (e) {
      emit(ResultsError('Failed to load results'));
    }
  }

  Future<void> createResult(Map<String, dynamic> data) async {
    try {
      await _repo.createResult(data);
      await loadResults();
    } catch (e) {
      emit(ResultsError('Failed to create result'));
    }
  }

  Future<void> deleteResult(String id) async {
    try {
      await _repo.deleteResult(id);
      await loadResults();
    } catch (e) {
      emit(ResultsError('Failed to delete result'));
    }
  }
}
