import 'package:flutter/material.dart';

class AppTheme {
  // ─── Atmospheric Intelligence · Earth & Atmosphere Palette ───
  // Inspired by Stitch design system, elevated for production-grade mobile UX.

  // Primary — Warm Sand (CTAs, active states, accents)
  static const Color primary = Color(0xFF75593F);
  static const Color primaryContainer = Color(0xFFCFAB8D);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onPrimaryContainer = Color(0xFF593F28);

  // Secondary — Warm Beige (subtle accents, grouping, secondary nav)
  static const Color secondary = Color(0xFF6B5C4B);
  static const Color secondaryContainer = Color(0xFFF5DFCA);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color onSecondaryContainer = Color(0xFF726251);

  // Tertiary — Cool Teal (info accents, contrast points)
  static const Color tertiary = Color(0xFF44636B);
  static const Color tertiaryContainer = Color(0xFF97B7C0);
  static const Color onTertiary = Color(0xFFFFFFFF);
  static const Color onTertiaryContainer = Color(0xFF2A4950);

  // Error — Warm Red (not neon, never harsh)
  static const Color error = Color(0xFFBA1A1A);
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color onErrorContainer = Color(0xFF93000A);

  // Surface & Background — Earth tones
  static const Color background = Color(0xFFBBDCE5); // Cool soft blue-gray canvas
  static const Color surface = Color(0xFFECEEDF); // Warm off-white glass panels
  static const Color surfaceBright = Color(0xFFF9FBEB);
  static const Color surfaceContainer = Color(0xFFEDEFE0);
  static const Color surfaceContainerHigh = Color(0xFFE7E9DB);
  static const Color surfaceContainerHighest = Color(0xFFE2E4D5);
  static const Color surfaceDim = Color(0xFFD9DBCD);

  // Text colors — Deep charcoal, never pure black
  static const Color onBackground = Color(0xFF1A1D14);
  static const Color onSurface = Color(0xFF1A1D14);
  static const Color onSurfaceVariant = Color(0xFF4F453D);

  // Borders — Organic muted tones
  static const Color outline = Color(0xFF81756C);
  static const Color outlineVariant = Color(0xFFD3C4B9);

  // Inverse — For dark-on-light contrast areas
  static const Color inverseSurface = Color(0xFF2E3228);
  static const Color inverseOnSurface = Color(0xFFF0F2E3);
  static const Color inversePrimary = Color(0xFFE5BFA0);

  // Severity Colors — Warm-tinted for light backgrounds
  static const Color severityCritical = Color(0xFFBA1A1A);
  static const Color severityHigh = Color(0xFFCC5500);
  static const Color severityMedium = Color(0xFF8B6914);
  static const Color severityLow = Color(0xFF2E7D5B);

  // Glassmorphism Constants
  static const double glassBlurRadius = 24.0;
  static const double glassBorderWidth = 0.5;
  static const double cardRadius = 24.0;
  static const double pillRadius = 9999.0;

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: 'Roboto',
      colorScheme: const ColorScheme.light(
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
        onError: onError,
        errorContainer: errorContainer,
        onErrorContainer: onErrorContainer,
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
        backgroundColor: Colors.transparent,
        foregroundColor: onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: onSurface,
          letterSpacing: -0.3,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceDim,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(pillRadius),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(pillRadius),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(pillRadius),
          borderSide: const BorderSide(color: primaryContainer, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(pillRadius),
          borderSide: const BorderSide(color: error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(pillRadius),
          borderSide: const BorderSide(color: error, width: 1.5),
        ),
        hintStyle: const TextStyle(color: Color(0xFF9A8E84), fontSize: 14),
        labelStyle: const TextStyle(
          color: onSurfaceVariant,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryContainer,
          foregroundColor: onPrimaryContainer,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(pillRadius),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: onSurface,
          side: const BorderSide(color: outlineVariant),
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(pillRadius),
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.w600,
          color: onSurface,
          letterSpacing: -1.5,
          height: 1.1,
        ),
        displayMedium: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w500,
          color: onSurface,
          letterSpacing: -0.5,
          height: 1.2,
        ),
        headlineLarge: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: onSurface,
          height: 1.2,
        ),
        headlineMedium: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: onSurface,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: onSurface,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: onSurface,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: onSurface,
          height: 1.6,
          letterSpacing: 0.15,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: onSurfaceVariant,
          height: 1.5,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: onSurface,
          letterSpacing: 0.3,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: onSurfaceVariant,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  // Keep backward compatibility — the app currently references darkTheme
  static ThemeData get darkTheme => lightTheme;
}
