<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$input = stream_get_contents(STDIN);
$data = json_decode($input, true);
if (!is_array($data)) { fwrite(STDERR, "Invalid input\n"); exit(1); }
$username = trim((string)($data['username'] ?? ''));
$password = (string)($data['password'] ?? '');
if (!preg_match('/^[a-zA-Z0-9_.-]{3,40}$/', $username)) { fwrite(STDERR, "Login: 3-40 latin characters\n"); exit(1); }
if (strlen($password) < 12) { fwrite(STDERR, "Password must contain at least 12 characters\n"); exit(1); }
$dir = __DIR__ . '/storage';
if (!is_dir($dir) && !mkdir($dir, 0750, true)) { fwrite(STDERR, "Cannot create storage\n"); exit(1); }
$file = $dir . '/admins.json';
$admins = is_file($file) ? json_decode((string)file_get_contents($file), true) : [];
if (!is_array($admins)) $admins = [];
foreach ($admins as $admin) {
    if (($admin['username'] ?? '') === $username) { fwrite(STDERR, "This login already exists\n"); exit(1); }
}
$admins[] = ['username' => $username, 'password_hash' => password_hash($password, PASSWORD_DEFAULT)];
$tmp = $file . '.tmp';
file_put_contents($tmp, json_encode($admins, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
if (!rename($tmp, $file)) { fwrite(STDERR, "Cannot save admin\n"); exit(1); }
echo "Administrator created. Password is stored as a hash.\n";
