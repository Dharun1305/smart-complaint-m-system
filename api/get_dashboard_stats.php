<?php
// api/get_dashboard_stats.php
session_start();
require_once 'db_connect.php';

// Always send JSON
header('Content-Type: application/json');

// 1. Check Login
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized'
    ]);
    exit;
}

$user_id    = $_SESSION['user_id'];
$first_name = $_SESSION['first_name'] ?? 'User';

try {
    // 2. Count totals for the three colored cards
    $statsQuery = "
        SELECT 
            COUNT(CASE WHEN status = 'open' THEN 1 END)        AS open_count,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS progress_count,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END)    AS resolved_count
        FROM complaints
        WHERE user_id = ?
    ";

    $stmt = $pdo->prepare($statsQuery);
    $stmt->execute([$user_id]);
    $counts = $stmt->fetch(PDO::FETCH_ASSOC) ?: [
        'open_count'     => 0,
        'progress_count' => 0,
        'resolved_count' => 0
    ];

    // 3. Fetch Recent Activity (Limit to 3)
    $recentQuery = "
        SELECT 
            complaint_id AS id,
            title,
            category,
            status,
            submission_date
        FROM complaints
        WHERE user_id = ?
        ORDER BY submission_date DESC
        LIMIT 3
    ";

    $stmtRecent = $pdo->prepare($recentQuery);
    $stmtRecent->execute([$user_id]);
    $recentItems = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success'   => true,
        'user_name' => $first_name,
        'stats'     => [
            'open'        => (int)($counts['open_count'] ?? 0),
            'in_progress' => (int)($counts['progress_count'] ?? 0),
            'resolved'    => (int)($counts['resolved_count'] ?? 0)
        ],
        'recent'    => $recentItems
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
