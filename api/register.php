<?php
// api/register.php
session_start();
require_once 'db_connect.php';

header('Content-Type: application/json');

// Optional: if you really want to block logged-in users, you can comment
// this whole block during development.
/*
if (isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'You are already logged in. Please log out to register a new account.'
    ]);
    exit;
}
*/

// 1. Get JSON data from frontend
$data = json_decode(file_get_contents("php://input"), true);

// Extract and sanitize input data
$firstName = trim($data['firstName'] ?? '');
$lastName  = trim($data['lastName'] ?? '');
$email     = strtolower(trim($data['email'] ?? '')); // Store email as lowercase
$phone     = trim($data['phone'] ?? '');
$password  = $data['password'] ?? '';

// 2. Server-side validation
if (empty($firstName) || empty($email) || empty($password) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'message' => 'Please fill in required fields (First Name, Email, Password) and use a valid email format.'
    ]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Password must be at least 6 characters long.'
    ]);
    exit;
}

// 3. Hash the password
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    // 4. Insert new user; default role = user
    $sql = "INSERT INTO users (first_name, last_name, email, password_hash, phone, role)
            VALUES (?, ?, ?, ?, ?, 'user')";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $passwordHash,
        $phone
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Registration successful! You can now log in.'
    ]);
} catch (PDOException $e) {
    if ($e->getCode() == '23000') {
        http_response_code(409); // Duplicate email
        echo json_encode([
            'success' => false,
            'message' => 'An account with this email already exists.'
        ]);
    } else {
        error_log("Registration error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'An unexpected server error occurred during registration.'
        ]);
    }
    exit;
}
