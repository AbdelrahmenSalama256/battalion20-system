import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../cubits/soldiers/soldiers_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_service.dart';
import '../../../data/models/soldier_model.dart';
import '../../../data/repositories/api_repository.dart';
import '../../widgets/score_badge.dart';

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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(AC.card),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) => _SoldierFormSheet(
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
          padding: EdgeInsets.all(12.w),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    hintText: 'بحث...',
                    prefixIcon: Icon(Icons.search, color: const Color(AC.textSecondary), size: 20.r),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 12.h),
                  ),
                  style: TextStyle(fontSize: 14.sp, color: const Color(AC.textPrimary)),
                  onSubmitted: (_) => _search(),
                ),
              ),
              SizedBox(width: 8.w),
              Container(
                height: 44.h,
                padding: EdgeInsets.symmetric(horizontal: 8.w),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(AC.cardBorder)),
                  borderRadius: BorderRadius.circular(8.r),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String?>(
                    value: _weaponFilter,
                    dropdownColor: const Color(AC.card),
                    hint: Text('الكل', style: TextStyle(color: const Color(AC.textSecondary), fontSize: 13.sp)),
                    items: [
                      DropdownMenuItem(value: null, child: Text('الكل', style: TextStyle(fontSize: 13.sp))),
                      ..._weapons.map((w) => DropdownMenuItem(
                        value: w['id'], child: Text('${w['icon']} ${w['name']}', style: TextStyle(fontSize: 13.sp)),
                      )),
                    ],
                    onChanged: (v) {
                      _weaponFilter = v;
                      _search();
                    },
                  ),
                ),
              ),
              SizedBox(width: 8.w),
              Container(
                width: 44.r, height: 44.r,
                decoration: BoxDecoration(
                  color: const Color(AC.gold).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12.r),
                ),
                child: IconButton(
                  icon: Icon(Icons.add, color: const Color(AC.gold), size: 22.r),
                  onPressed: () => _showForm(null),
                ),
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
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 48.r, color: const Color(AC.danger)),
                      SizedBox(height: 8.h),
                      Text(state.message, style: TextStyle(fontSize: 14.sp, color: const Color(AC.danger))),
                    ],
                  ),
                );
              }
              if (state is! SoldiersLoaded) return const SizedBox();
              final soldiers = state.soldiers;
              if (soldiers.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64.r, color: const Color(AC.textSecondary)),
                      SizedBox(height: 12.h),
                      Text('لا يوجد أفراد', style: TextStyle(fontSize: 16.sp, color: const Color(AC.textSecondary))),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                color: const Color(AC.gold),
                onRefresh: () => context.read<SoldiersCubit>().loadSoldiers(
                  search: _searchCtrl.text,
                  weaponId: _weaponFilter,
                ),
                child: ListView.builder(
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 4.h),
                  itemCount: soldiers.length,
                  itemBuilder: (ctx, i) {
                    final s = soldiers[i];
                    return Container(
                      margin: EdgeInsets.only(bottom: 8.h),
                      decoration: BoxDecoration(
                        color: const Color(AC.card),
                        borderRadius: BorderRadius.circular(12.r),
                        border: Border.all(color: const Color(AC.cardBorder)),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12.r),
                        onTap: () => _showForm(s),
                        child: Padding(
                          padding: EdgeInsets.all(12.w),
                          child: Row(
                            children: [
                              Container(
                                width: 44.r, height: 44.r,
                                decoration: BoxDecoration(
                                  color: const Color(AC.gold).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12.r),
                                ),
                                child: Center(
                                  child: Text(s.weaponIcon ?? '👤', style: TextStyle(fontSize: 22.sp)),
                                ),
                              ),
                              SizedBox(width: 12.w),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s.name, style: TextStyle(fontSize: 15.sp, fontWeight: FontWeight.w600, color: const Color(AC.textPrimary))),
                                    SizedBox(height: 2.h),
                                    Text(
                                      [s.rankName, s.weaponName, s.specialtyName].where((x) => x != null).join(' • '),
                                      style: TextStyle(fontSize: 12.sp, color: const Color(AC.textSecondary)),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(Icons.chevron_left, color: const Color(AC.textSecondary), size: 20.r),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SoldierFormSheet extends StatefulWidget {
  final ApiService api;
  final SoldierModel? soldier;
  final List<Map<String, dynamic>> weapons;
  final VoidCallback onSaved;

  const _SoldierFormSheet({
    required this.api,
    this.soldier,
    required this.weapons,
    required this.onSaved,
  });

  @override
  State<_SoldierFormSheet> createState() => _SoldierFormSheetState();
}

class _SoldierFormSheetState extends State<_SoldierFormSheet> {
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('فشل حفظ الجندي', style: TextStyle(fontSize: 14.sp)),
          backgroundColor: const Color(AC.danger),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
        ));
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
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 16.w, 20.w, bottomInset + 16.h),
      child: _loading
          ? SizedBox(
              height: 200.h,
              child: const Center(child: CircularProgressIndicator(color: Color(AC.gold))),
            )
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 48.w, height: 4.h,
                      decoration: BoxDecoration(
                        color: const Color(AC.cardBorder),
                        borderRadius: BorderRadius.circular(2.r),
                      ),
                    ),
                  ),
                  SizedBox(height: 16.h),
                  Text(
                    widget.soldier != null ? 'تعديل جندي' : 'إضافة جندي',
                    style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.bold, color: const Color(AC.gold)),
                  ),
                  SizedBox(height: 16.h),
                  TextField(controller: _nameCtrl, decoration: InputDecoration(labelText: 'الاسم', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h))),
                  SizedBox(height: 12.h),
                  TextField(controller: _milIdCtrl, decoration: InputDecoration(labelText: 'الرقم العسكري', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h))),
                  SizedBox(height: 12.h),
                  DropdownButtonFormField<String>(
                    value: _weaponId,
                    decoration: InputDecoration(labelText: 'السلاح', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: widget.weapons.map<DropdownMenuItem<String>>((w) => DropdownMenuItem<String>(
                      value: w['id'] as String?, child: Text('${w['icon']} ${w['name']}', style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) { setState(() { _weaponId = v; }); _loadSpecialties(v); },
                  ),
                  SizedBox(height: 12.h),
                  DropdownButtonFormField<String>(
                    value: _specialtyId,
                    decoration: InputDecoration(labelText: 'التخصص', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: _specialties.map<DropdownMenuItem<String>>((s) => DropdownMenuItem<String>(
                      value: s['id'] as String?, child: Text(s['name'] ?? '', style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) => setState(() => _specialtyId = v),
                  ),
                  SizedBox(height: 12.h),
                  DropdownButtonFormField<String>(
                    value: _rankTypes.isNotEmpty ? _rankTypes.first['id'] as String? : null,
                    decoration: InputDecoration(labelText: 'فئة الرتبة', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: _rankTypes.map<DropdownMenuItem<String>>((rt) => DropdownMenuItem<String>(
                      value: rt['id'] as String?, child: Text(rt['name'] ?? '', style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) => _loadRanks(v),
                  ),
                  SizedBox(height: 12.h),
                  DropdownButtonFormField<String>(
                    value: _rankId,
                    decoration: InputDecoration(labelText: 'الرتبة', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)),
                    dropdownColor: const Color(AC.card),
                    items: _ranks.map<DropdownMenuItem<String>>((r) => DropdownMenuItem<String>(
                      value: r['id'] as String?, child: Text(r['name'] ?? '', style: TextStyle(fontSize: 14.sp)),
                    )).toList(),
                    onChanged: (v) => setState(() => _rankId = v),
                  ),
                  SizedBox(height: 12.h),
                  TextField(controller: _notesCtrl, decoration: InputDecoration(labelText: 'ملاحظات', contentPadding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h)), maxLines: 3),
                  SizedBox(height: 20.h),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _save,
                          style: ElevatedButton.styleFrom(
                            padding: EdgeInsets.symmetric(vertical: 14.h),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
                          ),
                          child: Text('حفظ', style: TextStyle(fontSize: 15.sp)),
                        ),
                      ),
                      SizedBox(width: 12.w),
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.symmetric(vertical: 14.h),
                            foregroundColor: const Color(AC.textSecondary),
                          ),
                          child: Text('إلغاء', style: TextStyle(fontSize: 15.sp)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
