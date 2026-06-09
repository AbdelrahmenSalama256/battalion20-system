import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'core/constants/app_constants.dart';
import 'core/network/api_service.dart';
import 'core/theme/app_theme.dart';
import 'presentation/cubits/auth/auth_cubit.dart';
import 'presentation/cubits/dashboard/dashboard_cubit.dart';
import 'presentation/screens/login/login_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(BattalionApp());
}

class BattalionApp extends StatelessWidget {
  BattalionApp({super.key});

  final ApiService _api = ApiService();

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(430, 932),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (_, __) => MultiRepositoryProvider(
        providers: [
          RepositoryProvider<ApiService>.value(value: _api),
        ],
        child: MultiBlocProvider(
          providers: [
            BlocProvider(create: (_) => AuthCubit(_api)..checkAuth()),
            BlocProvider(create: (_) => DashboardCubit(_api)),
          ],
          child: MaterialApp(
            title: AC.appName,
            theme: AppTheme.darkTheme,
            debugShowCheckedModeBanner: false,
            home: BlocBuilder<AuthCubit, AuthState>(
              builder: (ctx, state) {
                if (state is AuthAuthenticated) {
                  return const DashboardScreen();
                }
                if (state is AuthLoading || state is AuthInitial) {
                  return Scaffold(
                    body: Center(
                      child: CircularProgressIndicator(
                        color: const Color(AC.gold),
                      ),
                    ),
                  );
                }
                return const LoginScreen();
              },
            ),
          ),
        ),
      ),
    );
  }
}
