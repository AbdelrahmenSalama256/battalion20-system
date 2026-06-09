import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

sealed class AnnouncementsState extends Equatable {
  const AnnouncementsState();
  @override
  List<Object?> get props => [];
}

final class AnnouncementsInitial extends AnnouncementsState {
  const AnnouncementsInitial();
}

final class AnnouncementsLoading extends AnnouncementsState {
  const AnnouncementsLoading();
}

final class AnnouncementsLoaded extends AnnouncementsState {
  final List announcements;
  const AnnouncementsLoaded(this.announcements);
  @override
  List<Object?> get props => [announcements];
}

final class AnnouncementsError extends AnnouncementsState {
  final String message;
  const AnnouncementsError(this.message);
  @override
  List<Object?> get props => [message];
}

class AnnouncementsCubit extends Cubit<AnnouncementsState> {
  final ApiRepository _repo;

  AnnouncementsCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(AnnouncementsInitial());

  Future<void> loadAnnouncements() async {
    emit(AnnouncementsLoading());
    try {
      final announcements = await _repo.getAnnouncements();
      emit(AnnouncementsLoaded(announcements));
    } catch (e) {
      emit(AnnouncementsError('Failed to load announcements'));
    }
  }

  Future<void> createAnnouncement(Map<String, dynamic> data) async {
    try {
      await _repo.createAnnouncement(data);
      await loadAnnouncements();
    } catch (e) {
      emit(AnnouncementsError('Failed to create announcement'));
    }
  }

  Future<void> deleteAnnouncement(String id) async {
    try {
      await _repo.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (e) {
      emit(AnnouncementsError('Failed to delete announcement'));
    }
  }
}
