import 'package:flutter_test/flutter_test.dart';
import 'package:battalion20/core/constants/app_constants.dart';

void main() {
  testWidgets('App constants are correct', (WidgetTester tester) async {
    expect(AC.appName, 'كتيبة 20');
    expect(AC.gold, 0xFFC9A84C);
  });
}
