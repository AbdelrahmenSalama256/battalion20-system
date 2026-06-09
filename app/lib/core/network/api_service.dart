import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class ApiService {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AC.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (opts, handler) async {
        final t = await _storage.read(key: AC.tokenKey);
        if (t != null) opts.headers['Authorization'] = 'Bearer $t';
        handler.next(opts);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          await _storage.delete(key: AC.tokenKey);
        }
        handler.next(e);
      },
    ));
  }

  Future<Response> get(String path, {Map<String, dynamic>? params}) =>
      _dio.get(path, queryParameters: params);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> put(String path, {dynamic data}) =>
      _dio.put(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path) =>
      _dio.delete(path);

  Future<void> saveToken(String token) =>
      _storage.write(key: AC.tokenKey, value: token);

  Future<String?> getToken() =>
      _storage.read(key: AC.tokenKey);

  Future<void> clearToken() =>
      _storage.delete(key: AC.tokenKey);
}
