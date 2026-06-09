import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/repositories/api_repository.dart';
import '../../../data/models/exam_model.dart';
import '../../widgets/score_badge.dart';

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({super.key});

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  String? _typeFilter;
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final repo = ApiRepository(api);
      final data = await repo.getResults(type: _typeFilter);
      setState(() => _results = List<Map<String, dynamic>>.from(data['results']));
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _showEnterResult() {
    final api = context.read<ApiService>();
    showDialog(
      context: context,
      builder: (ctx) => _EnterResultDialog(api: api, onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _typeFilter,
                  decoration: const InputDecoration(labelText: 'Type', isDense: true),
                  dropdownColor: const Color(AC.card),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All')),
                    DropdownMenuItem(value: 'exam', child: Text('Exam')),
                    DropdownMenuItem(value: 'fitness', child: Text('Fitness')),
                  ],
                  onChanged: (v) { setState(() => _typeFilter = v); _load(); },
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.add_circle, color: Color(AC.gold)),
                onPressed: _showEnterResult,
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(AC.gold)))
              : _results.isEmpty
                  ? const Center(child: Text('No results', style: TextStyle(color: Color(AC.textSecondary))))
                  : ListView.builder(
                      itemCount: _results.length,
                      itemBuilder: (ctx, i) {
                        final r = _results[i];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: ListTile(
                            title: Text(r['soldier_name'] ?? '', style: const TextStyle(color: Color(AC.textPrimary))),
                            subtitle: Text('${r['exam_title'] ?? ''} • ${r['exam_date'] ?? ''}'),
                            trailing: ScoreBadge(score: (r['total_score'] ?? 0).toDouble()),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

class _EnterResultDialog extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;
  const _EnterResultDialog({required this.api, required this.onSaved});

  @override
  State<_EnterResultDialog> createState() => _EnterResultDialogState();
}

class _EnterResultDialogState extends State<_EnterResultDialog> {
  List<Map<String, dynamic>> _soldiers = [];
  List<ExamModel> _exams = [];
  List<ExamItem> _items = [];
  String? _selectedSoldierId;
  String? _selectedExamId;
  Map<String, TextEditingController> _scoreControllers = {};
  bool _loading = true;
  double _totalScore = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final repo = ApiRepository(widget.api);
      final soldiers = await repo.getSoldiers();
      final exams = await repo.getExams();
      if (mounted) setState(() {
        _soldiers = soldiers.map((s) => {'id': s.id, 'name': s.name, 'militaryId': s.militaryId}).toList();
        _exams = exams;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadExamItems(String examId) async {
    try {
      final repo = ApiRepository(widget.api);
      final exam = await repo.getExam(examId);
      if (mounted) setState(() {
        _items = exam.items ?? [];
        _scoreControllers = {};
        for (final item in _items) {
          _scoreControllers[item.id] = TextEditingController();
        }
        _calculateTotal();
      });
    } catch (_) {}
  }

  void _calculateTotal() {
    double totalGot = 0, totalMax = 0;
    for (final item in _items) {
      final ctrl = _scoreControllers[item.id];
      final val = double.tryParse(ctrl?.text ?? '') ?? 0;
      totalGot += val;
      totalMax += item.maxScore;
    }
    setState(() {
      _totalScore = totalMax > 0 ? (totalGot / totalMax) * 100 : 0;
    });
  }

  Future<void> _save() async {
    if (_selectedSoldierId == null || _selectedExamId == null) return;
    final scores = _items.map((item) {
      final ctrl = _scoreControllers[item.id];
      return {'itemId': item.id, 'value': double.tryParse(ctrl?.text ?? '') ?? 0};
    }).toList();
    try {
      final repo = ApiRepository(widget.api);
      await repo.createResult({
        'examId': _selectedExamId,
        'soldierId': _selectedSoldierId,
        'scores': scores,
      });
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save result')),
        );
      }
    }
  }

  @override
  void dispose() {
    for (final c in _scoreControllers.values) { c.dispose(); }
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
                    const Text('Add Result', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(AC.gold))),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Soldier'),
                      dropdownColor: const Color(AC.card),
                      items: _soldiers.map<DropdownMenuItem<String>>((s) => DropdownMenuItem<String>(
                        value: s['id'] as String?, child: Text('${s['name']} (${s['militaryId'] ?? ''})'),
                      )).toList(),
                      onChanged: (v) => setState(() => _selectedSoldierId = v),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Exam'),
                      dropdownColor: const Color(AC.card),
                      items: _exams.map<DropdownMenuItem<String>>((e) => DropdownMenuItem<String>(value: e.id, child: Text(e.title))).toList(),
                      onChanged: (v) { setState(() => _selectedExamId = v); _loadExamItems(v!); },
                    ),
                    if (_items.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      ..._items.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: TextField(
                          controller: _scoreControllers[item.id],
                          decoration: InputDecoration(
                            labelText: '${item.text} (max: ${item.maxScore})',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) => _calculateTotal(),
                        ),
                      )),
                      const SizedBox(height: 12),
                      Card(
                        color: const Color(AC.gold).withOpacity(0.1),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total:', style: TextStyle(fontWeight: FontWeight.bold, color: Color(AC.textPrimary))),
                              ScoreBadge(score: _totalScore),
                            ],
                          ),
                        ),
                      ),
                    ],
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
