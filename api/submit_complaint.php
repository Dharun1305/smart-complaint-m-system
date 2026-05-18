<?php
session_start();
require_once 'db_connect.php'; 
header('Content-Type: application/json');

// 1. Authentication Check
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
    exit;
}

$user_id = $_SESSION['user_id'];

// 2. Collect Data from POST
$title = trim($_POST['title'] ?? '');
$category = trim($_POST['category'] ?? '');
$location = trim($_POST['location'] ?? '');
$description = trim($_POST['description'] ?? '');

if (empty($title) || empty($category) || empty($location) || empty($description)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please fill all required fields.']);
    exit;
}

// 3. Robust Image Handling
$upload_dir = __DIR__ . '/../uploads/'; 
$base_url = 'uploads/'; 

if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$image_urls = [];
$allowed_types = ['image/jpeg', 'image/png', 'image/gif'];

if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
    $num_files = min(count($_FILES['images']['name']), 4);
    for ($i = 0; $i < $num_files; $i++) {
        if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
            $tmp_name = $_FILES['images']['tmp_name'][$i];
            $file_type = mime_content_type($tmp_name);
            
            if (in_array($file_type, $allowed_types)) {
                $ext = pathinfo($_FILES['images']['name'][$i], PATHINFO_EXTENSION);
                $unique_name = time() . '_' . uniqid() . '.' . $ext;
                
                if (move_uploaded_file($tmp_name, $upload_dir . $unique_name)) {
                    $image_urls[] = $base_url . $unique_name; 
                }
            }
        }
    }
}
$image_urls_json = json_encode($image_urls);

try {
    // 4. INSERT QUERY - Corrected for your specific schema
    // Removed 'date_submitted' because your column is 'submission_date' and it is AUTO-FILLED.
    $sql = "INSERT INTO complaints 
            (user_id, title, category, location, description, status, image_urls) 
            VALUES (?, ?, ?, ?, ?, 'open', ?)";
        
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $user_id, 
        $title, 
        $category, 
        $location, 
        $description, 
        $image_urls_json
    ]);

    echo json_encode(['success' => true, 'message' => 'Complaint submitted successfully!']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()]);
}