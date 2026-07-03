import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/bloc/auth/bloc.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/screens/home/home_screen.dart';
import 'package:mobile/services/auth_service.dart';

void main() {
  testWidgets('shows authenticated dashboard placeholder', (tester) async {
    const user = User(
      id: 'user-1',
      email: 'admin@nirikshan.com',
      name: 'Super Admin',
      role: 'ADMIN',
    );

    await tester.pumpWidget(
      RepositoryProvider<AuthService>(
        create: (_) => AuthService(),
        child: BlocProvider<AuthBloc>(
          create: (context) =>
              AuthBloc(authService: context.read<AuthService>()),
          child: const MaterialApp(
            home: HomeScreen(user: user, initializeNotifications: false),
          ),
        ),
      ),
    );

    expect(find.text('ADMIN'), findsOneWidget);
    expect(find.text('Event Snapshots'), findsOneWidget);
  });
}
