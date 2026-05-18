<?php
// api/update_status.php

session_start();
require_once 'db_connect.php';

header('Content-Type: application/json');

// 1. Authentication Check
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized access. Please log in.'
    ]);
    exit;
}

// 2. Authorization Check (Role Check)
$user_role = $_SESSION['user_role'] ?? 'user';
if ($user_role !== 'admin' && $user_role !== 'staff') {
    http_response_code(403); // Forbidden
    echo json_encode([
        'success' => false,
        'message' => 'Forbidden. Only administrators or staff can update complaint status.'
    ]);
    exit;
}

// 3. Get JSON data from frontend (ID and new status)
$rawBody = file_get_contents('php://input');
$data    = json_decode($rawBody, true) ?? [];

$complaintId = $data['id'] ?? null;
$newStatus   = isset($data['status']) ? strtolower(trim($data['status'])) : '';

// 4. Server-side Validation
$validStatuses = ['open', 'in_progress', 'resolved'];

if (empty($complaintId) || !is_numeric($complaintId) || !in_array($newStatus, $validStatuses, true)) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'message' => 'Invalid complaint ID or status provided.'
    ]);
    exit;
}

try {
    // 5. Update the complaint status in the database (no date_updated column)
    $sql = "UPDATE complaints
            SET status = ?
            WHERE complaint_id = ?";
    $stmt = $pdo->prepare($sql);

    $success = $stmt->execute([$newStatus, $complaintId]);

    if ($success && $stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Complaint status updated to ' . $newStatus . '.'
        ]);
    } elseif ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Complaint ID not found or status unchanged.'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update status due to an unknown database issue.'
        ]);
    }
} catch (PDOException $e) {
    error_log('Status update error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'DB error: ' . $e->getMessage()
    ]);
}
