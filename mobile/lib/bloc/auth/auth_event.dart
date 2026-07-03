import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested({
    required this.email,
    required this.password,
  });

  @override
  List<Object> get props => [email, password];
}

class LoginSuccess extends AuthEvent {
  final String token;

  const LoginSuccess({required this.token});

  @override
  List<Object> get props => [token];
}

class LogoutRequested extends AuthEvent {
  const LogoutRequested();
}

class AuthStatusChanged extends AuthEvent {
  final bool isAuthenticated;

  const AuthStatusChanged({required this.isAuthenticated});

  @override
  List<Object> get props => [isAuthenticated];
}

class CheckAuthStatus extends AuthEvent {
  const CheckAuthStatus();
}

