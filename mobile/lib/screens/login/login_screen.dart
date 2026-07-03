import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/auth/bloc.dart';
import '../../config/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late TextEditingController _emailController;
  late TextEditingController _passwordController;
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter email and password'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    // Validate email format
    if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid email'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(
          LoginRequested(email: email, password: password),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthLoading) {
          setState(() => _isLoading = true);
        } else {
          setState(() => _isLoading = false);
        }

        if (state is AuthSuccess) {
          // Navigate to home/dashboard
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Login successful!'),
              backgroundColor: AppTheme.tertiary,
            ),
          );
          // TODO: Navigate to dashboard
        }

        if (state is AuthFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.error,
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.background,
        body: SingleChildScrollView(
          child: Column(
            children: [
              // Top decorative section
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppTheme.surfaceContainer,
                      AppTheme.background,
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    // Logo
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primary.withOpacity(0.3),
                            blurRadius: 20,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.primaryContainer,
                            ),
                            child: const Icon(
                              Icons.shield,
                              color: AppTheme.primary,
                              size: 40,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Title
                    Text(
                      'NIRIKSHAN AI',
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.onSurface,
                            letterSpacing: 2,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    // Subtitle
                    Text(
                      'AI SURVEILLANCE COMMAND',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppTheme.tertiary,
                            letterSpacing: 1.5,
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              // Form section
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Form title
                    Text(
                      'Login to Your Account',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.onSurface,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enter your email and password to login.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 32),
                    // Email field
                    _buildTextField(
                      controller: _emailController,
                      label: 'Email',
                      icon: Icons.email,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 24),
                    // Password field
                    _buildPasswordField(),
                    const SizedBox(height: 32),
                    // Login button
                    _buildLoginButton(),
                    const SizedBox(height: 24),
                    // Divider
                    Divider(
                      color: Colors.white.withOpacity(0.05),
                      height: 1,
                    ),
                    const SizedBox(height: 24),
                    // Links
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          alignment: Alignment.center,
                          child: _buildLink(
                            label: 'Forgot Password?',
                            icon: Icons.help_outline,
                            onTap: () {
                              // TODO: Navigate to forgot password
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(
        color: AppTheme.onSurface,
        fontFamily: 'monospace',
      ),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(
          icon,
          color: AppTheme.outline,
          size: 20,
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.outlineVariant, width: 1),
        ),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.outlineVariant, width: 1),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.primary, width: 2),
        ),
        labelStyle: const TextStyle(
          color: AppTheme.onSurfaceVariant,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        floatingLabelBehavior: FloatingLabelBehavior.auto,
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      style: const TextStyle(
        color: AppTheme.onSurface,
        fontFamily: 'monospace',
      ),
      decoration: InputDecoration(
        labelText: 'Password',
        prefixIcon: Icon(
          Icons.key,
          color: AppTheme.outline,
          size: 20,
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePassword ? Icons.visibility_off : Icons.visibility,
            color: AppTheme.outline,
            size: 20,
          ),
          onPressed: () {
            setState(() => _obscurePassword = !_obscurePassword);
          },
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.outlineVariant, width: 1),
        ),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.outlineVariant, width: 1),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: AppTheme.primary, width: 2),
        ),
        labelStyle: const TextStyle(
          color: AppTheme.onSurfaceVariant,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        floatingLabelBehavior: FloatingLabelBehavior.auto,
      ),
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleLogin,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryContainer,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppTheme.primaryContainer.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          elevation: 4,
        ),
        child: _isLoading
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppTheme.primary,
                  ),
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.verified_user, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    'LOGIN',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.2,
                        ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildLink({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
            color: const Color(0xFF95CCDD),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: const Color(0xFF95CCDD),
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }
}
