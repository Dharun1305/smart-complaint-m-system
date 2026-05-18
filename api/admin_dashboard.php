<?php
    // admin_dashboard.php
    session_start();
    
    // 1. Authentication Check
    if (!isset($_SESSION['user_id'])) {
        // Not logged in: Redirect to login page
        header('Location: login.html');
        exit;
    }

    $user_role = $_SESSION['user_role'] ?? 'user';

    // 2. Authorization Check (Role Check)
    // Only allow 'admin' or 'staff' to proceed
    if ($user_role !== 'admin' && $user_role !== 'staff') {
        // Logged in, but not authorized: Redirect to their standard dashboard
        header('Location: dashboard.html');
        exit;
    }
    
    // 3. If authorized (Admin or Staff), load the HTML page.
    include 'admin_dashboard.html';
?>