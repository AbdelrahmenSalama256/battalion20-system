import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

sealed class FitnessState extends Equatable {
  const FitnessState();
  @override
  List<Object?> get props => [];
}

final class FitnessInitial extends FitnessState {
  const FitnessInitial();
}

final class FitnessLoading extends FitnessState {
  const FitnessLoading();
}

final class FitnessLoaded extends FitnessState {
  final List exercises;
  const FitnessLoaded(this.exercises);
  @override
  List<Object?> get props => [exercises];
}

final class FitnessSuccess extends FitnessState {
  final String message;
  const FitnessSuccess(this.message);
  @override
  List<Object?> get props => [message];
}

final class FitnessError extends FitnessState {
  final String message;
  const FitnessError(this.message);
  @override
  List<Object?> get props => [message];
}

class FitnessCubit extends Cubit<FitnessState> {
  final ApiRepository _repo;

  FitnessCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(FitnessInitial());

  Future<void> loadExercises() async {
    emit(FitnessLoading());
    try {
      final exercises = await _repo.getFitnessExercises();
      emit(FitnessLoaded(exercises));
    } catch (e) {
      emit(FitnessError('Failed to load exercises'));
    }
  }

  Future<void> submitResult(Map<String, dynamic> data) async {
    try {
      await _repo.createFitnessResult(data);
      emit(FitnessSuccess('Fitness result saved successfully'));
    } catch (e) {
      emit(FitnessError('Failed to save fitness result'));
    }
  }
}
