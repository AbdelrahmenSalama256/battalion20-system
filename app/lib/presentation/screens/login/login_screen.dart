import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/auth/auth_cubit.dart';
import '../../../core/constants/app_constants.dart';
import '../dashboard/dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscured = true;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _login() {
    if (_usernameCtrl.text.isEmpty || _passwordCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter username and password')),
      );
      return;
    }
    context.read<AuthCubit>().login(_usernameCtrl.text, _passwordCtrl.text);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100, height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(AC.gold), width: 3),
                ),
                child: Icon(Icons.shield, size: 50, color: const Color(0xFFC9A84C)),
              ),
              const SizedBox(height: 16),
              Text('Battalion 20', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFFC9A84C))),
              const SizedBox(height: 8),
              Text('Military Evaluation System', style: const TextStyle(fontSize: 16, color: Color(0xFF9CAF88))),
              const SizedBox(height: 48),
              TextField(
                controller: _usernameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Username',
                  prefixIcon: Icon(Icons.person, color: Color(AC.gold)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordCtrl,
                obscureText: _obscured,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock, color: Color(AC.gold)),
                  suffixIcon: IconButton(
                    icon: Icon(_obscured ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscured = !_obscured),
                  ),
                ),
                onSubmitted: (_) => _login(),
              ),
              const SizedBox(height: 32),
              BlocConsumer<AuthCubit, AuthState>(
                listener: (ctx, state) {
                  if (state is AuthAuthenticated) {
                    Navigator.pushReplacement(context,
                      MaterialPageRoute(builder: (_) => const DashboardScreen()));
                  } else if (state is AuthError) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(state.message)),
                    );
                  }
                },
                builder: (ctx, state) {
                  if (state is AuthLoading) {
                    return const CircularProgressIndicator(color: Color(AC.gold));
                  }
                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _login,
                      child: const Text('Login'),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
