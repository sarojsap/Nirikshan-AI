import 'package:flutter/material.dart';

class AppTheme {
  // Colors from the design
  static const Color primary = Color(0xFFBBC3FF);
  static const Color primaryContainer = Color(0xFF293681);
  static const Color onPrimary = Color(0xFF1A2873);
  static const Color onPrimaryContainer = Color(0xFF96A3F5);
  
  static const Color secondary = Color(0xFFB0C6FF);
  static const Color secondaryContainer = Color(0xFF004AAE);
  static const Color onSecondary = Color(0xFF002D6E);
  
  static const Color tertiary = Color(0xFF98CFE0);
  static const Color tertiaryContainer = Color(0xFF004452);
  static const Color onTertiary = Color(0xFF003641);
  
  static const Color error = Color(0xFFFFB4AB);
  static const Color errorContainer = Color(0xFF93000A);
  
  static const Color background = Color(0xFF021616);
  static const Color surface = Color(0xFF021616);
  static const Color surfaceBright = Color(0xFF283D3C);
  static const Color surfaceContainer = Color(0xFF0E2323);
  static const Color surfaceContainerHigh = Color(0xFF192D2D);
  
  static const Color onBackground = Color(0xFFD0E7E6);
  static const Color onSurface = Color(0xFFD0E7E6);
  static const Color onSurfaceVariant = Color(0xFFC6C5D3);
  
  static const Color outline = Color(0xFF90909C);
  static const Color outlineVariant = Color(0xFF454651);
  
  static const Color inverseSurface = Color(0xFFD0E7E6);
  static const Color inverseOnSurface = Color(0xFF1F3434);
  static const Color inversePrimary = Color(0xFF4C58A5);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        secondary: secondary,
        onSecondary: onSecondary,
        secondaryContainer: secondaryContainer,
        tertiary: tertiary,
        onTertiary: onTertiary,
        tertiaryContainer: tertiaryContainer,
        error: error,
        onError: Color(0xFF690005),
        errorContainer: errorContainer,
        background: background,
        onBackground: onBackground,
        surface: surface,
        onSurface: onSurface,
        outline: outline,
        outlineVariant: outlineVariant,
        inverseSurface: inverseSurface,
        onInverseSurface: inverseOnSurface,
        inversePrimary: inversePrimary,
      ),
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: onSurface,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: false,
        fillColor: Colors.transparent,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
        border: const UnderlineInputBorder(
          borderSide: BorderSide(color: outlineVariant),
        ),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: outlineVariant),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: primary, width: 2),
        ),
        hintStyle: const TextStyle(color: onSurfaceVariant),
        labelStyle: const TextStyle(color: onSurfaceVariant),
      ),
      buttonTheme: const ButtonThemeData(
        buttonColor: primaryContainer,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryContainer,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            horizontal: 32,
            vertical: 16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          elevation: 4,
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.bold,
          color: onSurface,
          letterSpacing: -0.02,
        ),
        displayMedium: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.bold,
          color: onSurface,
        ),
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w600,
          color: onSurface,
          letterSpacing: -0.01,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w500,
          color: onSurface,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: onSurface,
        ),
        bodyLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w400,
          color: onSurface,
          height: 1.56,
        ),
        bodyMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: onSurface,
          height: 1.5,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: onSurface,
          letterSpacing: 0.05,
        ),
        labelSmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: onSurface,
          letterSpacing: 0.08,
        ),
      ),
    );
  }
}
