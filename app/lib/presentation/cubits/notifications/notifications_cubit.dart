import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/notification_model.dart';

sealed class NotificationsState extends Equatable {
  const NotificationsState();
  @override
  List<Object?> get props => [];
}

final class NotificationsInitial extends NotificationsState {
  const NotificationsInitial();
}

final class NotificationsLoaded extends NotificationsState {
  final List<NotificationModel> notifications;
  final int unreadCount;
  const NotificationsLoaded(this.notifications, {this.unreadCount = 0});
  @override
  List<Object?> get props => [notifications, unreadCount];
}

final class NotificationsError extends NotificationsState {
  final String message;
  const NotificationsError(this.message);
  @override
  List<Object?> get props => [message];
}

class NotificationsCubit extends Cubit<NotificationsState> {
  final ApiRepository _repo;
  Timer? _pollTimer;

  NotificationsCubit(ApiService api)
      : _repo = ApiRepository(api),
        super(NotificationsInitial());

  Future<void> loadNotifications() async {
    try {
      final notifications = await _repo.getNotifications();
      final unread = await _repo.getUnreadCount();
      emit(NotificationsLoaded(notifications, unreadCount: unread));
    } catch (e) {
      emit(NotificationsError('فشل تحميل الإشعارات'));
    }
  }

  void startPolling() {
    loadNotifications();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _checkUnread();
    });
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _checkUnread() async {
    try {
      final count = await _repo.getUnreadCount();
      if (state is NotificationsLoaded) {
        final current = state as NotificationsLoaded;
        if (current.unreadCount != count) {
          await loadNotifications();
        }
      } else {
        await loadNotifications();
      }
    } catch (_) {}
  }

  Future<void> markRead(String id) async {
    await _repo.markNotificationRead(id);
    await loadNotifications();
  }

  Future<void> markAllRead() async {
    await _repo.markAllNotificationsRead();
    await loadNotifications();
  }

  @override
  Future<void> close() {
    stopPolling();
    return super.close();
  }
}
