import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth/bloc.dart';
import 'login/login_screen.dart';
import 'home/home_screen.dart';
import 'splash/splash_screen.dart';

class AppNavigator extends StatelessWidget {
  const AppNavigator({super.key});

  @override
  Widget build(BuildContext context) {
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
