<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$storage = __DIR__ . '/storage';
$contentFile = $storage . '/content.json';
$adminsFile = $storage . '/admins.json';
if (!is_dir($storage)) mkdir($storage, 0750, true);

function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function read_json(string $file, array $fallback = []): array {
    if (!is_file($file)) return $fallback;
    $raw = file_get_contents($file);
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : $fallback;
}
function write_json(string $file, array $data): bool {
    $tmp = $file . '.tmp';
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false || file_put_contents($tmp, $json, LOCK_EX) === false) return false;
    return rename($tmp, $file);
}
function safe_substr(string $value, int $start, int $length): string {
    if (function_exists('mb_substr')) return mb_substr($value, $start, $length, 'UTF-8');
    $chars = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($chars)) return substr($value, $start, $length);
    return implode('', array_slice($chars, $start, $length));
}
$action = $_GET['action'] ?? '';
// Public read-only endpoint: exposes only catalog detail descriptions and photo URLs.
if ($action === 'catalog_details') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, ['error' => 'Method not allowed']);
    $page = (string)($_GET['page'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_]{1,100}$/', $page)) respond(400, ['error' => 'Invalid page']);
    $allContent = read_json($contentFile);
    $prefix = 'details:' . $page . ':';
    $publicDetails = [];
    foreach ($allContent as $key => $value) {
        if (is_string($key) && str_starts_with($key, $prefix) && is_array($value)) {
            $description = isset($value['description']) && is_string($value['description']) ? safe_substr($value['description'], 0, 3000) : '';
            $photos = [];
            if (isset($value['photos']) && is_array($value['photos'])) {
                foreach (array_slice($value['photos'], 0, 3) as $photo) {
                    if (is_string($photo) && preg_match('#^uploads/[a-f0-9]{32}\.(?:jpg|png|webp)$#', $photo)) $photos[] = $photo;
                }
            }
            $publicDetails[$key] = ['description' => $description, 'photos' => $photos];
        }
    }
    respond(200, ['details' => $publicDetails]);
}
// Public, read-only content needed to render saved images and catalog cards for visitors.
if ($action === 'public_content') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, ['error' => 'Method not allowed']);
    $page = (string)($_GET['page'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_]{1,100}$/', $page)) respond(400, ['error' => 'Invalid page']);
    $allContent = read_json($contentFile);
    $images = [];
    $imagePrefix = 'image:' . $page . ':';
    foreach ($allContent as $key => $value) {
        if (is_string($key) && str_starts_with($key, $imagePrefix) &&
            is_string($value) && preg_match('#^uploads/[a-f0-9]{32}\.(?:jpg|png|webp)$#', $value)) {
            $images[$key] = $value;
        }
    }
    $catalog = $allContent['catalog:' . $page] ?? null;
    if (!is_array($catalog)) $catalog = null;
    else {
        $catalog = array_values(array_filter(array_slice($catalog, 0, 100), static function ($item) {
            return is_array($item) && isset($item['title'], $item['description']) &&
                is_string($item['title']) && is_string($item['description']);
        }));
        foreach ($catalog as &$item) {
            $item['title'] = safe_substr($item['title'], 0, 180);
            $item['description'] = safe_substr($item['description'], 0, 2000);
            $item['price'] = isset($item['price']) && is_string($item['price']) ? safe_substr($item['price'], 0, 80) : '0 ₸';
            $item['image'] = isset($item['image']) && is_string($item['image']) &&
                preg_match('#^uploads/[a-f0-9]{32}\.(?:jpg|png|webp)$#', $item['image']) ? $item['image'] : '';
        }
        unset($item);
    }
    respond(200, ['images' => $images, 'catalog' => $catalog]);
}
if ($action === 'status') {
    respond(200, ['authenticated' => !empty($_SESSION['tamasa_admin']), 'csrf' => $_SESSION['csrf'] ?? null]);
}
if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $admins = read_json($adminsFile);
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $valid = false;
    foreach ($admins as $admin) {
        if (isset($admin['username'], $admin['password_hash']) &&
            hash_equals((string)$admin['username'], $username) &&
            password_verify($password, (string)$admin['password_hash'])) {
            $valid = true; break;
        }
    }
    if (!$valid) {
        usleep(350000);
        respond(401, ['error' => 'Неверный логин или пароль']);
    }
    session_regenerate_id(true);
    $_SESSION['tamasa_admin'] = true;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(200, ['ok' => true, 'csrf' => $_SESSION['csrf']]);
}
if (empty($_SESSION['tamasa_admin'])) respond(401, ['error' => 'Требуется авторизация']);
if ($action === 'load') {
    respond(200, ['content' => read_json($contentFile)]);
}
if ($action === 'save') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    if (!hash_equals((string)($_SESSION['csrf'] ?? ''), (string)($body['csrf'] ?? ''))) respond(403, ['error' => 'CSRF validation failed']);
    $key = (string)($body['key'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_.:-]{1,180}$/', $key)) respond(400, ['error' => 'Invalid key']);
    $content = read_json($contentFile);
    $content[$key] = $body['value'] ?? null;
    if (!write_json($contentFile, $content)) respond(500, ['error' => 'Не удалось сохранить данные']);
    respond(200, ['ok' => true]);
}
if ($action === 'upload') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);
    if (!hash_equals((string)($_SESSION['csrf'] ?? ''), (string)($_POST['csrf'] ?? ''))) respond(403, ['error' => 'CSRF validation failed']);
    if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) respond(400, ['error' => 'Ошибка загрузки файла']);
    $file = $_FILES['image'];
    if (($file['size'] ?? 0) > 12 * 1024 * 1024) respond(400, ['error' => 'Максимальный размер фото 12 МБ']);
    if (!is_uploaded_file($file['tmp_name'])) respond(400, ['error' => 'Некорректный загруженный файл']);

    // fileinfo is optional on some Windows PHP installations. getimagesize() provides
    // the actual image MIME from the file header and avoids a fatal "Class finfo not found".
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false || empty($imageInfo['mime'])) respond(400, ['error' => 'Файл не является корректным изображением']);
    $mime = (string)$imageInfo['mime'];
    if (class_exists('finfo')) {
        try {
            $detected = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            if (is_string($detected) && $detected !== '') $mime = $detected;
        } catch (Throwable $e) {
            // Fall back to the MIME reported by getimagesize().
        }
    }
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) respond(400, ['error' => 'Поддерживаются только JPG, PNG и WebP']);

    $key = (string)($_POST['key'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_.:-]{1,180}$/', $key)) respond(400, ['error' => 'Некорректный ключ изображения']);
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) respond(500, ['error' => 'Не удалось создать папку uploads']);
    $name = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) respond(500, ['error' => 'Не удалось сохранить изображение']);
    $url = 'uploads/' . $name;
    $content = read_json($contentFile);
    $content[$key] = $url;
    if (!write_json($contentFile, $content)) respond(500, ['error' => 'Не удалось сохранить адрес изображения']);
    respond(200, ['ok' => true, 'url' => $url, 'path' => $url, 'src' => $url]);
}
respond(404, ['error' => 'Unknown action']);
