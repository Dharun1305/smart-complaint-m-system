<?php
// api/login.php

// ---------------------------------------------------------------------
// Error reporting (development only)
// ---------------------------------------------------------------------
error_reporting(E_ALL);
ini_set('display_errors', 1);

// JSON response
header('Content-Type: application/json');

// Basic CORS (same origin or simple dev use)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

session_start();

// ---------------------------------------------------------------------
// Helper to send JSON and stop
// ---------------------------------------------------------------------
function sendResponse($success, $message, $user = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];

    if ($user) {
        $response['user'] = [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role']
        ];
    }

    echo json_encode($response);
    exit;
}

// ---------------------------------------------------------------------
// 1. Method check
// ---------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Invalid request method. Only POST is allowed.');
}

// ---------------------------------------------------------------------
// 2. Read and validate JSON body
// ---------------------------------------------------------------------
$json_data = file_get_contents('php://input');
if (!$json_data) {
    sendResponse(false, 'Error: No login data received. Check client headers.');
}

$data = json_decode($json_data, true);
if (!is_array($data)) {
    sendResponse(false, 'Invalid JSON payload.');
}

if (!isset($data['email'], $data['password'])) {
    sendResponse(false, 'Missing email or password in JSON payload.');
}

$email    = trim($data['email']);
$password = $data['password'];

if ($email === '' || $password === '') {
    sendResponse(false, 'Email and password cannot be empty.');
}

// ---------------------------------------------------------------------
// 3. DB lookup
// ---------------------------------------------------------------------
require_once 'db_connect.php';

$sql = "SELECT
            user_id AS id,
            first_name,
            last_name,
            email,
            password_hash AS password,
            role
        FROM users
        WHERE email = ?";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // Build full name
        $user['name'] = trim($user['first_name'] . ' ' . $user['last_name']);

        // Save session
        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        sendResponse(true, 'Login successful.', $user);
    }

    // Wrong email or password
    sendResponse(false, 'Invalid email or password.');
} catch (PDOException $e) {
    error_log('PDO Query Error in login.php: ' . $e->getMessage());
    http_response_code(500);
    sendResponse(false, 'DB Query Failed: ' . $e->getMessage());
}

// Fallback (should not hit)
sendResponse(false, 'An unexpected server termination occurred.');
