import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/exams/exams_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../widgets/score_badge.dart';

class ExamsScreen extends StatefulWidget {
  const ExamsScreen({super.key});

  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _tabCtrl.addListener(() {
      final types = ['general', 'weapon', 'specialty'];
      context.read<ExamsCubit>().loadExams(type: types[_tabCtrl.index]);
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  void _showCreateDialog() {
    final api = context.read<ApiService>();
    showDialog(
      context: context,
      builder: (ctx) => _ExamFormDialog(api: api, onCreated: () {
        final types = ['general', 'weapon', 'specialty'];
        context.read<ExamsCubit>().loadExams(type: types[_tabCtrl.index]);
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: TabBar(
                  controller: _tabCtrl,
                  labelColor: const Color(AC.gold),
                  unselectedLabelColor: const Color(AC.textSecondary),
                  indicatorColor: const Color(AC.gold),
                  tabs: const [
                    Tab(text: 'General'), Tab(text: 'Weapon'), Tab(text: 'Specialty'),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle, color: Color(AC.gold)),
                onPressed: _showCreateDialog,
              ),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: List.generate(3, (_) =>
              BlocBuilder<ExamsCubit, ExamsState>(
                builder: (ctx, state) {
                  if (state is ExamsLoading) {
                    return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
                  }
                  if (state is ExamsError) {
                    return Center(child: Text(state.message, style: const TextStyle(color: Color(AC.danger))));
                  }
                  if (state is! ExamsLoaded) return const SizedBox();
                  final exams = state.exams;
                  if (exams.isEmpty) {
                    return const Center(child: Text('No exams found', style: TextStyle(color: Color(AC.textSecondary))));
                  }
                  return ListView.builder(
                    itemCount: exams.length,
                    itemBuilder: (ctx, i) {
                      final e = exams[i];
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        child: ListTile(
                          title: Text(e.title, style: const TextStyle(color: Color(AC.textPrimary), fontWeight: FontWeight.bold)),
                          subtitle: Text(
                            '${e.itemCount} items • ${e.resultCount} results',
                            style: const TextStyle(fontSize: 12),
                          ),
                          trailing: e.avgScore != null
                              ? ScoreBadge(score: e.avgScore!)
                              : null,
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ExamFormDialog extends StatefulWidget {
  final ApiService api;
  final VoidCallback onCreated;
  const _ExamFormDialog({required this.api, required this.onCreated});

  @override
  State<_ExamFormDialog> createState() => _ExamFormDialogState();
}

class _ExamFormDialogState extends State<_ExamFormDialog> {
  final _titleCtrl = TextEditingController();
  final _itemsCtrl = TextEditingController();
  String _type = 'general';
  String? _weaponId;
  String? _specialtyId;
  List<Map<String, dynamic>> _weapons = [];

  @override
  void initState() {
    super.initState();
    _loadWeapons();
  }

  void _loadWeapons() async {
    try {
      final repo = ApiRepository(widget.api);
      _weapons = await repo.getWeapons();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _save() async {
    if (_titleCtrl.text.isEmpty) return;
    final itemsText = _itemsCtrl.text.trim();
    if (itemsText.isEmpty) return;
    final items = itemsText.split('\n')
        .where((l) => l.trim().isNotEmpty)
        .map((l) {
          final parts = l.split('|');
          return {'text': parts[0].trim(), 'maxScore': parts.length > 1 ? double.tryParse(parts[1].trim()) ?? 10 : 10};
        }).toList();
    if (items.isEmpty) return;
    final data = {
      'title': _titleCtrl.text,
      'type': _type,
      'weaponId': _type == 'weapon' ? _weaponId : null,
      'specialtyId': _type == 'specialty' ? _specialtyId : null,
      'items': items,
    };
    try {
      final repo = ApiRepository(widget.api);
      await repo.createExam(data);
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create exam')),
        );
      }
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _itemsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(AC.card),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Create Exam', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(AC.gold))),
              const SizedBox(height: 16),
              TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Exam Title')),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _type,
                decoration: const InputDecoration(labelText: 'Type'),
                dropdownColor: const Color(AC.card),
                items: const [
                  DropdownMenuItem(value: 'general', child: Text('General')),
                  DropdownMenuItem(value: 'weapon', child: Text('Weapon')),
                  DropdownMenuItem(value: 'specialty', child: Text('Specialty')),
                ],
                onChanged: (v) => setState(() => _type = v!),
              ),
              if (_type == 'weapon') ...[
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Weapon'),
                  dropdownColor: const Color(AC.card),
                  items: _weapons.map<DropdownMenuItem<String>>((w) => DropdownMenuItem<String>(value: w['id'] as String?, child: Text(w['name'] ?? ''))).toList(),
                  onChanged: (v) => setState(() => _weaponId = v),
                ),
              ],
              const SizedBox(height: 12),
              TextField(
                controller: _itemsCtrl,
                decoration: const InputDecoration(
                  labelText: 'Exam Items',
                  hintText: 'Item 1 | 10\nItem 2 | 15',
                ),
                maxLines: 6,
              ),
              const SizedBox(height: 8),
              const Text('Write each item on a new line, use | to specify max score',
                  style: TextStyle(fontSize: 11, color: Color(AC.textSecondary))),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(child: ElevatedButton(onPressed: _save, child: const Text('Create'))),
                  const SizedBox(width: 12),
                  Expanded(child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
