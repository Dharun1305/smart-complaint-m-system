<?php
// api/update_complaint_status.php

session_start();
require_once 'db_connect.php';

header('Content-Type: application/json');

// 1. Security: Only Admin/Staff can update status
$user_role = $_SESSION['user_role'] ?? null;
if (!$user_role || !in_array($user_role, ['admin', 'staff'], true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

// 2. Read JSON payload
$rawBody = file_get_contents("php://input");
$data    = json_decode($rawBody, true) ?? [];

$complaintId = $data['complaint_id'] ?? null;    // expects complaint_id
$newStatus   = isset($data['status']) ? strtolower(trim($data['status'])) : '';

// 3. Validate ENUM values and ID
$allowed = ['open', 'in_progress', 'resolved'];

if (empty($complaintId) || !is_numeric($complaintId) || !in_array($newStatus, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid ID or Status']);
    exit;
}

try {
    // 4. Update complaint status
    $stmt = $pdo->prepare(
        "UPDATE complaints 
         SET status = ?, date_updated = NOW() 
         WHERE complaint_id = ?"
    );
    $stmt->execute([$newStatus, $complaintId]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Complaint not found or no changes made']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Update failed: ' . $e->getMessage()
    ]);
}
