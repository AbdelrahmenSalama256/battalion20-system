import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/fitness/fitness_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';

class FitnessScreen extends StatefulWidget {
  const FitnessScreen({super.key});

  @override
  State<FitnessScreen> createState() => _FitnessScreenState();
}

class _FitnessScreenState extends State<FitnessScreen> {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FitnessCubit, FitnessState>(
      listener: (ctx, state) {
        if (state is FitnessSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        } else if (state is FitnessError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      builder: (ctx, state) {
        if (state is FitnessLoading) {
          return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
        }
        if (state is FitnessError) {
          return Center(child: Text(state.message, style: const TextStyle(color: Color(AC.danger))));
        }
        if (state is! FitnessLoaded) return const SizedBox();
        final exercises = state.exercises;
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Text('Fitness Exercises', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: Color(AC.gold)),
                    onPressed: () => _showFitnessResultDialog(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: exercises.isEmpty
                  ? const Center(child: Text('No exercises', style: TextStyle(color: Color(AC.textSecondary))))
                  : ListView.builder(
                      itemCount: exercises.length,
                      itemBuilder: (ctx, i) {
                        final ex = exercises[i];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: ListTile(
                            leading: const Icon(Icons.fitness_center, color: Color(AC.gold)),
                            title: Text(ex['name'] ?? '', style: const TextStyle(color: Color(AC.textPrimary))),
                            subtitle: Text('Unit: ${ex['unit'] ?? '-'} • Pass mark: ${ex['pass_mark'] ?? 60}'),
                            trailing: Text(ex['higher_is_better'] == true ? 'Higher is better' : 'Lower is better',
                                style: const TextStyle(fontSize: 12, color: Color(AC.textSecondary))),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  void _showFitnessResultDialog(BuildContext context) {
    final api = context.read<ApiService>();
    showDialog(
      context: context,
      builder: (ctx) => _FitnessResultDialog(api: api, onSaved: () {
        context.read<FitnessCubit>().loadExercises();
      }),
    );
  }
}

class _FitnessResultDialog extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;
  const _FitnessResultDialog({required this.api, required this.onSaved});

  @override
  State<_FitnessResultDialog> createState() => _FitnessResultDialogState();
}

class _FitnessResultDialogState extends State<_FitnessResultDialog> {
  List<Map<String, dynamic>> _soldiers = [];
  List<Map<String, dynamic>> _exercises = [];
  String? _selectedSoldierId;
  Map<String, TextEditingController> _valueControllers = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final repo = ApiRepository(widget.api);
      final soldiers = await repo.getSoldiers();
      final exercises = await repo.getFitnessExercises();
      if (mounted) setState(() {
        _soldiers = soldiers.map((s) => {'id': s.id, 'name': s.name}).toList();
        _exercises = exercises;
        _valueControllers = {};
        for (final ex in exercises) {
          _valueControllers[ex['id']] = TextEditingController();
        }
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_selectedSoldierId == null) return;
    final results = _exercises.map((ex) {
      final ctrl = _valueControllers[ex['id']];
      return {'exerciseId': ex['id'], 'value': double.tryParse(ctrl?.text ?? '') ?? 0};
    }).toList();
    try {
      final repo = ApiRepository(widget.api);
      await repo.createFitnessResult({
        'soldierId': _selectedSoldierId,
        'results': results,
      });
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save fitness result')),
        );
      }
    }
  }

  @override
  void dispose() {
    for (final c in _valueControllers.values) { c.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(AC.card),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(AC.gold)))
            : SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Fitness Result', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(AC.gold))),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Soldier'),
                      dropdownColor: const Color(AC.card),
                      items: _soldiers.map<DropdownMenuItem<String>>((s) => DropdownMenuItem<String>(value: s['id'] as String?, child: Text(s['name']))).toList(),
                      onChanged: (v) => setState(() => _selectedSoldierId = v),
                    ),
                    const SizedBox(height: 12),
                    ..._exercises.map((ex) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: TextField(
                        controller: _valueControllers[ex['id']],
                        decoration: InputDecoration(
                          labelText: '${ex['name']} (${ex['unit'] ?? ''})',
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    )),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(child: ElevatedButton(onPressed: _save, child: const Text('Save'))),
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
