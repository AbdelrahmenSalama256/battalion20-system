import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_constants.dart';

void showToast(BuildContext context, String message, {bool isError = false, bool isSuccess = false}) {
  final color = isError
      ? const Color(AC.danger)
      : isSuccess
          ? const Color(AC.success)
          : const Color(AC.gold);
  ScaffoldMessenger.of(context).clearSnackBars();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Row(
        children: [
          Icon(
            isError ? Icons.error_outline : isSuccess ? Icons.check_circle_outline : Icons.info_outline,
            color: Colors.white,
            size: 20.r,
          ),
          SizedBox(width: 8.w),
          Expanded(child: Text(message, style: TextStyle(fontSize: 14.sp))),
        ],
      ),
      backgroundColor: color,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
      margin: EdgeInsets.all(12.w),
      duration: const Duration(seconds: 3),
    ),
  );
}
