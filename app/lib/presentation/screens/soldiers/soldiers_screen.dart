import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/soldiers/soldiers_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/models/soldier_model.dart';
import '../../../data/repositories/api_repository.dart';

class SoldiersScreen extends StatefulWidget {
  const SoldiersScreen({super.key});

  @override
  State<SoldiersScreen> createState() => _SoldiersScreenState();
}

class _SoldiersScreenState extends State<SoldiersScreen> {
  final _searchCtrl = TextEditingController();
  String? _weaponFilter;
  List<Map<String, dynamic>> _weapons = [];

  @override
  void initState() {
    super.initState();
    _loadWeapons();
  }

  void _loadWeapons() async {
    try {
      final api = context.read<ApiService>();
      final repo = ApiRepository(api);
      _weapons = await repo.getWeapons();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _search() {
    context.read<SoldiersCubit>().loadSoldiers(
      search: _searchCtrl.text,
      weaponId: _weaponFilter,
    );
  }

  void _showForm(SoldierModel? soldier) {
    final api = context.read<ApiService>();
    showDialog(
      context: context,
      builder: (ctx) => _SoldierFormDialog(
        api: api,
        soldier: soldier,
        weapons: _weapons,
        onSaved: () {
          context.read<SoldiersCubit>().loadSoldiers(
            search: _searchCtrl.text,
            weaponId: _weaponFilter,
          );
        },
      ),
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
                child: TextField(
                  controller: _searchCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: Icon(Icons.search, color: Color(AC.textSecondary)),
                    isDense: true,
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(AC.cardBorder)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String?>(
                    value: _weaponFilter,
                    dropdownColor: const Color(AC.card),
                    hint: const Text('Weapon', style: TextStyle(color: Color(AC.textSecondary), fontSize: 13)),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All', style: TextStyle(fontSize: 13))),
                      ..._weapons.map((w) => DropdownMenuItem(
                        value: w['id'], child: Text('${w['icon']} ${w['name']}', style: const TextStyle(fontSize: 13)),
                      )),
                    ],
                    onChanged: (v) {
                      _weaponFilter = v;
                      _search();
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.add_circle, color: Color(AC.gold)),
                onPressed: () => _showForm(null),
              ),
            ],
          ),
        ),
        Expanded(
          child: BlocBuilder<SoldiersCubit, SoldiersState>(
            builder: (ctx, state) {
              if (state is SoldiersLoading) {
                return const Center(child: CircularProgressIndicator(color: Color(AC.gold)));
              }
              if (state is SoldiersError) {
                return Center(child: Text(state.message, style: const TextStyle(color: Color(AC.danger))));
              }
              if (state is! SoldiersLoaded) return const SizedBox();
              final soldiers = state.soldiers;
              if (soldiers.isEmpty) {
                return const Center(child: Text('No soldiers found', style: TextStyle(color: Color(AC.textSecondary))));
              }
              return ListView.builder(
                itemCount: soldiers.length,
                itemBuilder: (ctx, i) {
                  final s = soldiers[i];
                  return Card(
                    margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Color(int.parse(s.weaponColor?.replaceFirst('#', '0xFF') ?? '0xFF2D6A4F')),
                        child: Text(s.weaponIcon ?? '👤', style: const TextStyle(fontSize: 18)),
                      ),
                      title: Text(s.name, style: const TextStyle(color: Color(AC.textPrimary), fontWeight: FontWeight.bold)),
                      subtitle: Text(
                        '${s.rankName ?? ''} • ${s.weaponName ?? ''} • ${s.specialtyName ?? ''}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit, color: Color(AC.gold), size: 20),
                        onPressed: () => _showForm(s),
                      ),
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

class _SoldierFormDialog extends StatefulWidget {
  final ApiService api;
  final SoldierModel? soldier;
  final List<Map<String, dynamic>> weapons;
  final VoidCallback onSaved;

  const _SoldierFormDialog({
    required this.api,
    this.soldier,
    required this.weapons,
    required this.onSaved,
  });

  @override
  State<_SoldierFormDialog> createState() => _SoldierFormDialogState();
}

class _SoldierFormDialogState extends State<_SoldierFormDialog> {
  final _nameCtrl = TextEditingController();
  final _milIdCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String? _weaponId;
  String? _specialtyId;
  String? _rankId;
  List<Map<String, dynamic>> _specialties = [];
  List<Map<String, dynamic>> _ranks = [];
  List<Map<String, dynamic>> _rankTypes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _nameCtrl.text = widget.soldier?.name ?? '';
    _milIdCtrl.text = widget.soldier?.militaryId ?? '';
    _notesCtrl.text = widget.soldier?.notes ?? '';
    _weaponId = widget.soldier?.weaponId;
    _specialtyId = widget.soldier?.specialtyId;
    _rankId = widget.soldier?.rankId;
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final repo = ApiRepository(widget.api);
      _rankTypes = await repo.getRankTypes();
      if (_weaponId != null) {
        _specialties = await repo.getSpecialties(weaponId: _weaponId);
      }
      if (mounted) setState(() => _loading = false);
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _loadSpecialties(String? weaponId) async {
    if (weaponId == null) return;
    try {
      final repo = ApiRepository(widget.api);
      _specialties = await repo.getSpecialties(weaponId: weaponId);
      if (mounted) setState(() { _specialtyId = null; });
    } catch (_) {}
  }

  void _loadRanks(String? typeId) async {
    if (typeId == null) return;
    try {
      final repo = ApiRepository(widget.api);
      _ranks = await repo.getRanks(typeId: typeId);
      if (mounted) setState(() { _rankId = null; });
    } catch (_) {}
  }

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty) return;
    final data = {
      'name': _nameCtrl.text,
      'militaryId': _milIdCtrl.text.isNotEmpty ? _milIdCtrl.text : null,
      'weaponId': _weaponId,
      'specialtyId': _specialtyId,
      'rankId': _rankId,
      'notes': _notesCtrl.text.isNotEmpty ? _notesCtrl.text : null,
    };
    try {
      final repo = ApiRepository(widget.api);
      if (widget.soldier != null) {
        await repo.updateSoldier(widget.soldier!.id, data);
      } else {
        await repo.createSoldier(data);
      }
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save soldier')),
        );
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _milIdCtrl.dispose();
    _notesCtrl.dispose();
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
                  children: [
                    Text(widget.soldier != null ? 'Edit Soldier' : 'Add Soldier',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(AC.gold))),
                    const SizedBox(height: 16),
                    TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
                    const SizedBox(height: 12),
                    TextField(controller: _milIdCtrl, decoration: const InputDecoration(labelText: 'Military ID')),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _weaponId,
                      decoration: const InputDecoration(labelText: 'Weapon'),
                      dropdownColor: const Color(AC.card),
                      items: widget.weapons.map<DropdownMenuItem<String>>((w) => DropdownMenuItem<String>(
                        value: w['id'] as String?, child: Text('${w['icon']} ${w['name']}'),
                      )).toList(),
                      onChanged: (v) { setState(() { _weaponId = v; }); _loadSpecialties(v); },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _specialtyId,
                      decoration: const InputDecoration(labelText: 'Specialty'),
                      dropdownColor: const Color(AC.card),
                      items: _specialties.map<DropdownMenuItem<String>>((s) => DropdownMenuItem<String>(
                        value: s['id'] as String?, child: Text(s['name'] ?? ''),
                      )).toList(),
                      onChanged: (v) => setState(() => _specialtyId = v),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _rankTypes.isNotEmpty ? _rankTypes.first['id'] as String? : null,
                      decoration: const InputDecoration(labelText: 'Rank Type'),
                      dropdownColor: const Color(AC.card),
                      items: _rankTypes.map<DropdownMenuItem<String>>((rt) => DropdownMenuItem<String>(
                        value: rt['id'] as String?, child: Text(rt['name'] ?? ''),
                      )).toList(),
                      onChanged: (v) => _loadRanks(v),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _rankId,
                      decoration: const InputDecoration(labelText: 'Rank'),
                      dropdownColor: const Color(AC.card),
                      items: _ranks.map<DropdownMenuItem<String>>((r) => DropdownMenuItem<String>(
                        value: r['id'] as String?, child: Text(r['name'] ?? ''),
                      )).toList(),
                      onChanged: (v) => setState(() => _rankId = v),
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: _notesCtrl, decoration: const InputDecoration(labelText: 'Notes'), maxLines: 3),
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
