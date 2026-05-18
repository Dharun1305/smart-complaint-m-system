<?php
// =========================================================================
// api/create_complaint.php - Fixed version for ENUM status
// =========================================================================
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

session_start();
require_once 'db_connect.php'; 

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
    exit;
}

$json_data = file_get_contents("php://input");
$data = json_decode($json_data, true);

if (!isset($data['title'], $data['description'], $data['category'], $data['location'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$title = trim($data['title']);
$description = trim($data['description']);
$category = trim($data['category']);
$location = trim($data['location']);
$imageUrlsJson = json_encode($data['image_urls'] ?? []);

// FIX 1: Must be 'open' to match your ENUM('open', 'in_progress', 'resolved')
$status = 'open'; 

// FIX 2: Omit 'submission_date' as it defaults to CURRENT_TIMESTAMP in DB
$sql = "INSERT INTO complaints (user_id, title, category, location, description, image_urls, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user_id, $title, $category, $location, $description, $imageUrlsJson, $status]);
    echo json_encode(['success' => true, 'message' => 'Complaint submitted successfully!']);
} catch (\PDOException $e) {
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]); 
}