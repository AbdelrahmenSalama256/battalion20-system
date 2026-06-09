import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/announcements/announcements_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  void _showCreateDialog() {
    final api = context.read<ApiService>();
    showDialog(
      context: context,
      builder: (ctx) => _AnnouncementFormDialog(api: api, onCreated: () {
        context.read<AnnouncementsCubit>().loadAnnouncements();
      }),
    );
  }

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'urgent': return const Color(AC.danger);
      case 'info': return const Color(AC.success);
      default: return const Color(AC.textSecondary);
    }
  }

  String _priorityLabel(String priority) {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'info': return 'Info';
      default: return 'Normal';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              const Text('Announcements', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.add_circle, color: Color(AC.gold)),
                onPressed: _showCreateDialog,
              ),
            ],
          ),
        ),
        Expanded(
          child: BlocBuilder<AnnouncementsCubit, AnnouncementsState>(
            builder: (ctx, state) {
              if (state is AnnouncementsLoading) {
                return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
              }
              if (state is AnnouncementsError) {
                return Center(child: Text(state.message, style: const TextStyle(color: Color(AC.danger))));
              }
              if (state is! AnnouncementsLoaded) return const SizedBox();
              final announcements = state.announcements;
              if (announcements.isEmpty) {
                return const Center(child: Text('No announcements', style: TextStyle(color: Color(AC.textSecondary))));
              }
              return ListView.builder(
                itemCount: announcements.length,
                itemBuilder: (ctx, i) {
                  final a = announcements[i];
                  return Card(
                    margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _priorityColor(a['priority'] ?? 'normal').withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _priorityLabel(a['priority'] ?? 'normal'),
                          style: TextStyle(
                            fontSize: 11,
                            color: _priorityColor(a['priority'] ?? 'normal'),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      title: Text(a['title'] ?? '', style: const TextStyle(color: Color(AC.textPrimary), fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (a['body'] != null) Text(a['body'], maxLines: 2, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text('${a['created_by_name'] ?? ''} • ${a['created_at']?.toString().substring(0, 10) ?? ''}',
                              style: const TextStyle(fontSize: 11, color: Color(AC.textSecondary))),
                        ],
                      ),
                      isThreeLine: true,
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AnnouncementFormDialog extends StatefulWidget {
  final ApiService api;
  final VoidCallback onCreated;
  const _AnnouncementFormDialog({required this.api, required this.onCreated});

  @override
  State<_AnnouncementFormDialog> createState() => _AnnouncementFormDialogState();
}

class _AnnouncementFormDialogState extends State<_AnnouncementFormDialog> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  String _priority = 'normal';

  Future<void> _save() async {
    if (_titleCtrl.text.isEmpty) return;
    try {
      final repo = ApiRepository(widget.api);
      await repo.createAnnouncement({
        'title': _titleCtrl.text,
        'body': _bodyCtrl.text.isNotEmpty ? _bodyCtrl.text : null,
        'priority': _priority,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create announcement')),
        );
      }
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(AC.card),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('New Announcement', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(AC.gold))),
            const SizedBox(height: 16),
            TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
            const SizedBox(height: 12),
            TextField(controller: _bodyCtrl, decoration: const InputDecoration(labelText: 'Body'), maxLines: 4),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              dropdownColor: const Color(AC.card),
              items: const [
                DropdownMenuItem(value: 'normal', child: Text('Normal')),
                DropdownMenuItem(value: 'info', child: Text('Info')),
                DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
              ],
              onChanged: (v) => setState(() => _priority = v!),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: ElevatedButton(onPressed: _save, child: const Text('Post'))),
                const SizedBox(width: 12),
                Expanded(child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
