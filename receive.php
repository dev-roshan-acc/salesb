<?php
/**
 * receive.php -- the dashboard's inbox.
 *
 * Santosh AI POSTs a JSON snapshot here every 30 minutes; the dashboard
 * page GETs the latest one. Push, not pull, because the laptop holding
 * the SAP connection sits behind a corporate firewall and cannot be
 * connected to from outside.
 *
 * Install
 *   1. Put this next to your dashboard page.
 *   2. Change SAI_TOKEN below to a long random string.
 *   3. Give the same string to the agent:
 *        setx SAI_DASHBOARD_TOKEN "<that string>"
 *   4. Make sure ./data is writable by the web server.
 *
 * GET  receive.php?name=sales   -> the stored snapshot as JSON
 * POST receive.php?name=sales   -> store one (needs X-SAI-Token)
 */

define('SAI_TOKEN', 'sai-7Kq2mVx9pL4wRt8nZbY3');
define('DATA_DIR', __DIR__ . '/data');
define('MAX_BYTES', 4 * 1024 * 1024);

header('Content-Type: application/json; charset=utf-8');

// Only [a-z0-9-] so a crafted name cannot walk out of the data folder.
$name = isset($_GET['name']) ? strtolower($_GET['name']) : 'sales';
if (!preg_match('/^[a-z0-9-]{1,40}$/', $name)) {
    http_response_code(400);
    echo json_encode(['error' => 'bad snapshot name']);
    exit;
}
$file = DATA_DIR . '/' . $name . '.json';

// ?status=1 answers "is this thing able to work at all", without a
// token and without touching the data. Open it in a browser when the
// dashboard says it is waiting and you want to know whose fault it is.
if (isset($_GET['status'])) {
    header('Access-Control-Allow-Origin: *');
    echo json_encode([
        'php' => PHP_VERSION,
        'data_dir' => DATA_DIR,
        'data_dir_exists' => is_dir(DATA_DIR),
        'data_dir_writable' => is_dir(DATA_DIR) && is_writable(DATA_DIR),
        'snapshots' => is_dir(DATA_DIR)
            ? array_values(array_diff(scandir(DATA_DIR), ['.', '..']))
            : [],
        'this_snapshot' => $name,
        'exists' => is_readable($file),
        'size' => is_readable($file) ? filesize($file) : 0,
        'modified' => is_readable($file) ? date('c', filemtime($file)) : null,
        'token_set' => SAI_TOKEN !== 'change-this-to-a-long-random-string',
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // The page may be on another host; only reading is opened up.
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: no-store');
    if (!is_readable($file)) {
        http_response_code(404);
        echo json_encode(['error' => 'no snapshot yet', 'name' => $name]);
        exit;
    }
    readfile($file);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'GET or POST only']);
    exit;
}

$sent = isset($_SERVER['HTTP_X_SAI_TOKEN']) ? $_SERVER['HTTP_X_SAI_TOKEN'] : '';
// hash_equals, not ==, so a wrong token cannot be guessed a character
// at a time by timing the reply.
if (!hash_equals(SAI_TOKEN, $sent)) {
    http_response_code(401);
    echo json_encode(['error' => 'bad or missing token']);
    exit;
}

$body = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if (strlen($body) > MAX_BYTES) {
    http_response_code(413);
    echo json_encode(['error' => 'snapshot too large']);
    exit;
}
$decoded = json_decode($body, true);
if ($decoded === null) {
    http_response_code(400);
    echo json_encode(['error' => 'body is not valid JSON']);
    exit;
}

$decoded['received_at'] = date('c');

// Every one of these can fail on shared hosting, and an unchecked
// failure is the worst kind: the agent is told 200 ok, the dashboard
// keeps saying "waiting", and nothing anywhere says why.
if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0750, true) && !is_dir(DATA_DIR)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'cannot create the data directory',
        'dir' => DATA_DIR,
        'hint' => 'create it by hand and make it writable by the web server',
    ]);
    exit;
}
if (!is_writable(DATA_DIR)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'data directory is not writable',
        'dir' => DATA_DIR,
        'hint' => 'chmod 755 (or 775) the data folder',
    ]);
    exit;
}

// Write to a temp file and rename: a page loading mid-upload should
// never see half a snapshot.
$tmp = $file . '.tmp';
$written = file_put_contents($tmp, json_encode($decoded));
if ($written === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write failed', 'file' => $tmp]);
    exit;
}
if (!rename($tmp, $file)) {
    @unlink($tmp);
    http_response_code(500);
    echo json_encode(['error' => 'rename failed', 'file' => $file]);
    exit;
}

echo json_encode([
    'ok' => true,
    'name' => $name,
    'bytes' => strlen($body),
    'stored_bytes' => $written,
    'file' => $file,
    'received_at' => $decoded['received_at'],
]);