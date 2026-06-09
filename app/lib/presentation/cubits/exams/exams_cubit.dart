import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/exam_model.dart';

sealed class ExamsState extends Equatable {
  const ExamsState();
  @override
  List<Object?> get props => [];
}

final class ExamsInitial extends ExamsState {
  const ExamsInitial();
}

final class ExamsLoading extends ExamsState {
  const ExamsLoading();
}

final class ExamsLoaded extends ExamsState {
  final List<ExamModel> exams;
  const ExamsLoaded(this.exams);
  @override
  List<Object?> get props => [exams];
}

final class ExamsError extends ExamsState {
  final String message;
  const ExamsError(this.message);
  @override
  List<Object?> get props => [message];
}

class ExamsCubit extends Cubit<ExamsState> {
  final ApiRepository _repo;

  ExamsCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(ExamsInitial());

  Future<void> loadExams({String? type, String? weaponId}) async {
    emit(ExamsLoading());
    try {
      final exams = await _repo.getExams(type: type, weaponId: weaponId);
      emit(ExamsLoaded(exams));
    } catch (e) {
      emit(ExamsError('Failed to load exams'));
    }
  }

  Future<void> createExam(Map<String, dynamic> data) async {
    try {
      await _repo.createExam(data);
      await loadExams();
    } catch (e) {
      emit(ExamsError('Failed to create exam'));
    }
  }

  Future<void> deleteExam(String id) async {
    try {
      await _repo.deleteExam(id);
      await loadExams();
    } catch (e) {
      emit(ExamsError('Failed to delete exam'));
    }
  }
}
