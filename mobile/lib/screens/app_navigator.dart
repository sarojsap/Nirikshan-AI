import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth/bloc.dart';
import '../config/api_config.dart';
import 'config/backend_config_screen.dart';
import 'login/login_screen.dart';
import 'home/home_screen.dart';
import 'splash/splash_screen.dart';

class AppNavigator extends StatefulWidget {
  const AppNavigator({super.key});

  @override
  State<AppNavigator> createState() => _AppNavigatorState();
}

class _AppNavigatorState extends State<AppNavigator> {
  bool _isConfigured = ApiConfig.isConfigured;

  void _onConfigured() {
    setState(() {
      _isConfigured = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isConfigured) {
      return BackendConfigScreen(onConfigured: _onConfigured);
    }

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthSuccess) {
          return HomeScreen(user: state.user);
        } else if (state is AuthInitial) {
          return const SplashScreen();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}
