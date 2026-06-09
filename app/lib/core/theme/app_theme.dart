import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(AC.bg),
      fontFamily: AC.fontFamily,
      useMaterial3: true,
      colorScheme: const ColorScheme.dark(
        primary: Color(AC.gold),
        secondary: Color(AC.success),
        surface: Color(AC.card),
        error: Color(AC.danger),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(AC.card),
        foregroundColor: Color(AC.textPrimary),
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: CardThemeData(
        color: const Color(AC.card),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(AC.cardBorder)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0D1508),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(AC.cardBorder)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(AC.cardBorder)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(AC.gold), width: 2),
        ),
        labelStyle: const TextStyle(color: Color(AC.textSecondary)),
        hintStyle: const TextStyle(color: Color(AC.textSecondary)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(AC.gold),
          foregroundColor: const Color(AC.bg),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: Color(AC.textPrimary), fontWeight: FontWeight.bold),
        headlineMedium: TextStyle(color: Color(AC.textPrimary), fontWeight: FontWeight.bold),
        titleLarge: TextStyle(color: Color(AC.textPrimary), fontWeight: FontWeight.bold),
        titleMedium: TextStyle(color: Color(AC.textPrimary)),
        bodyLarge: TextStyle(color: Color(AC.textPrimary)),
        bodyMedium: TextStyle(color: Color(AC.textSecondary)),
        labelLarge: TextStyle(color: Color(AC.gold)),
      ),
    );
  }
}
