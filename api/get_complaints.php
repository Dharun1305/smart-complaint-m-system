<?php
session_start();
require_once 'db_connect.php'; 
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    exit(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['user_role'] ?? 'user';

try {
    if ($role === 'admin' || $role === 'staff') {
        // Fetch ALL for Admin
        $sql = "SELECT c.complaint_id AS id, c.title, c.category, c.location, c.description, c.status, 
                       c.image_urls, c.submission_date AS date, u.first_name AS submitter 
                FROM complaints c 
                JOIN users u ON c.user_id = u.user_id 
                ORDER BY c.submission_date DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
    } else {
        // Fetch USER'S ONLY
        $sql = "SELECT complaint_id AS id, title, category, location, description, status, 
                       image_urls, submission_date AS date 
                FROM complaints 
                WHERE user_id = ? 
                ORDER BY submission_date DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$user_id]);
    }

    $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Process JSON images for frontend
    foreach ($complaints as &$c) {
        $c['image_urls'] = json_decode($c['image_urls'] ?? '[]', true);
    }

    echo json_encode(['success' => true, 'data' => $complaints]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Fetch failed: ' . $e->getMessage()]);
}