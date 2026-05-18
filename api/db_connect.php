<?php
// api/db_connect.php

// Force a 5-second maximum execution time for this script to prevent infinite browser freezes
// if the database server is completely unresponsive.
set_time_limit(5);

// Define database connection parameters (Configuration)
$host = 'localhost';
$db = 'scms_db';     // << IMPORTANT: Ensure this matches your database name
$user = 'root';      // Database user
$pass = '';          // Database password (often empty for default XAMPP/WAMP root)

// DSN (Data Source Name)
$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";

// PDO options for security and error handling
$options = [
    // Throw exceptions on errors, which is best for debugging and robust error handling
    PDO::ATTR_ERRMODE              => PDO::ERRMODE_EXCEPTION,
    // Fetch results as associative arrays by default
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    // Disable emulation mode for better performance and true prepared statements
    PDO::ATTR_EMULATE_PREPARES     => false,
    // Set connection timeout (client-side) to 3 seconds. This helps speed up the failure.
    PDO::ATTR_TIMEOUT              => 3 
];

try {
    // Attempt to establish the PDO connection
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Connection failed: Log the error and return a 500 JSON response to the client
    error_log("Database connection error: " . $e->getMessage());
    
    // Set the appropriate HTTP status code
    http_response_code(500);
    
    // Set JSON header for the error response
    header('Content-Type: application/json');
    
    // Output the error message as JSON
    // Provide a detailed message in the log, but a generic message to the client for security
    echo json_encode(['success' => false, 'message' => 'Internal server error: Database connection failed. Please check server logs.']);
    
    // Terminate script execution immediately
    exit;
}
