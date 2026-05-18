<?php
// api/logout.php
session_start(); // Start or resume the session

header('Content-Type: application/json');

// 1. Unset all session variables
$_SESSION = array();

// 2. Destroy the session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 3. Finally, destroy the session
session_destroy();

// 4. Return success response to the frontend
echo json_encode([
    'success' => true, 
    'message' => 'Logged out successfully.'
]);

// Note: main.js handles the client-side session removal and redirection after receiving this response.
?>