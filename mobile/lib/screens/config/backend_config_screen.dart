import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../config/theme.dart';

class BackendConfigScreen extends StatefulWidget {
  final VoidCallback onConfigured;
  final bool showBackButton;

  const BackendConfigScreen({
    super.key,
    required this.onConfigured,
    this.showBackButton = false,
  });

  @override
  State<BackendConfigScreen> createState() => _BackendConfigScreenState();
}

class _BackendConfigScreenState extends State<BackendConfigScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isTesting = false;
  String? _statusMessage;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    // Pre-populate with the current base URL if available
    final current = ApiConfig.baseUrl;
    // Strip "/api" and "http://" for cleaner user display
    var displayUrl = current.replaceFirst('http://', '').replaceFirst('https://', '');
    if (displayUrl.endsWith('/api')) {
      displayUrl = displayUrl.substring(0, displayUrl.length - 4);
    }
    _urlController.text = displayUrl;
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _testAndSave(String inputUrl) async {
    if (inputUrl.trim().isEmpty) {
      setState(() {
        _statusMessage = 'Please enter a valid IP address or URL.';
        _isSuccess = false;
      });
      return;
    }

    setState(() {
      _isTesting = true;
      _statusMessage = 'Connecting to server...';
      _isSuccess = false;
    });

    // Format the URL for testing
    var testUrl = inputUrl.trim();
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'http://$testUrl';
    }
    if (testUrl.endsWith('/')) {
      testUrl = testUrl.substring(0, testUrl.length - 1);
    }
    if (!testUrl.endsWith('/api')) {
      testUrl = '$testUrl/api';
    }

    try {
      final response = await http
          .get(Uri.parse('$testUrl/auth/me'))
          .timeout(const Duration(seconds: 4));

      // Any HTTP response (even 401 Unauthorized) means the server is reachable and running
      if (response.statusCode == 200 || response.statusCode == 401 || response.statusCode == 404) {
        // Save URL
        await ApiConfig.setBaseUrl(inputUrl);

        setState(() {
          _statusMessage = 'Connected successfully!';
          _isSuccess = true;
          _isTesting = false;
        });

        // Delay slightly for user to see success
        await Future.delayed(const Duration(milliseconds: 800));
        widget.onConfigured();
      } else {
        setState(() {
          _statusMessage = 'Server returned unexpected status code: ${response.statusCode}';
          _isSuccess = false;
          _isTesting = false;
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Failed to connect. Check if the server is running on the target IP/port.';
        _isSuccess = false;
        _isTesting = false;
      });
    }
  }

  void _applyPreset(String preset) {
    setState(() {
      _urlController.text = preset;
      _statusMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('SERVER CONFIGURATION'),
        leading: widget.showBackButton
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome / Instructions card
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceContainer,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Connect to Nirikshan Server',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please configure the backend IP address or URL of the computer running the Nirikshan AI server.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Form field
              Text(
                'SERVER ADDRESS',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _urlController,
                keyboardType: TextInputType.url,
                autocorrect: false,
                enableSuggestions: false,
                style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
                decoration: InputDecoration(
                  hintText: 'e.g. 192.168.1.100:5000',
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.clear, color: Colors.white30),
                    onPressed: () => _urlController.clear(),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Preset Section
              Text(
                'PRESETS & QUICK SETS',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.2,
                children: [
                  _PresetCard(
                    title: 'Android Emulator',
                    subtitle: '10.0.2.2:5000',
                    onTap: () => _applyPreset('10.0.2.2:5000'),
                  ),
                  _PresetCard(
                    title: 'Local PC Host',
                    subtitle: '192.168.1.XX:5000',
                    onTap: () => _applyPreset('192.168.1.29:5000'), // Common starting template
                  ),
                  _PresetCard(
                    title: 'Localhost (PC)',
                    subtitle: '127.0.0.1:5000',
                    onTap: () => _applyPreset('127.0.0.1:5000'),
                  ),
                  _PresetCard(
                    title: 'Custom Port',
                    subtitle: 'Enter manual IP',
                    onTap: () {},
                    isActive: false,
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Status messages
              if (_statusMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: _isSuccess
                        ? const Color(0xFF10B981).withOpacity(0.1)
                        : AppTheme.errorContainer.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _isSuccess ? const Color(0xFF10B981) : AppTheme.error,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isSuccess ? Icons.check_circle : Icons.error_outline,
                        color: _isSuccess ? const Color(0xFF10B981) : AppTheme.error,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _statusMessage!,
                          style: TextStyle(
                            color: _isSuccess ? const Color(0xFFD1FAE5) : AppTheme.error,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isTesting
                      ? null
                      : () => _testAndSave(_urlController.text),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryContainer,
                    disabledBackgroundColor: AppTheme.surfaceContainer,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isTesting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          'Save & Connect',
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PresetCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isActive;

  const _PresetCard({
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isActive = true,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.surfaceContainer,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: isActive ? onTap : null,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.outlineVariant),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: isActive ? AppTheme.onSurfaceVariant : Colors.white24,
                  fontSize: 11,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
