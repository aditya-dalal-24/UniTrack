package com.unitrack.unitrack_backend.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Known safe messages that can be returned to the client.
     * Any RuntimeException whose message is not in this set gets a generic response.
     */
    private static final Set<String> SAFE_MESSAGES = Set.of(
            // AuthService
            "Email already registered and verified",
            "Your account has been deactivated. Please contact an administrator.",
            "This account uses Google Sign-In. Please use the Google button to log in.",
            "Email is already verified",
            "No verification code found. Please request a new one.",
            "Verification code has expired. Please request a new one.",
            "Invalid verification code",
            "Invalid Google token",
            "This account uses Google Sign-In. Password reset is not available.",
            "No reset code found. Please request a new one.",
            "Reset code has expired. Please request a new one.",
            "Invalid reset code",
            "Invalid credentials",
            "Email not verified. Please verify your email first.",
            "Email is already registered",
            "User not found",
            "Invalid or expired OTP",
            "Invalid email",
            "Account is deactivated. Please contact admin.",
            "Email already exists with different auth provider",
            "Duplicate attendance record",
            // AdminService
            "Cannot modify the super admin account.",
            "Cannot deactivate the super admin account.",
            "Only a super admin can change user roles.",
            "Cannot change the primary super admin's role.",
            "Invalid role. Must be STUDENT, ADMIN, BOTH, or SUPER_ADMIN.",
            "Only a super admin can permanently delete user accounts.",
            "Cannot delete the primary super admin account.",
            "Cannot change role of primary super admin",
            "Only SUPER_ADMIN can delete users",
            "Cannot delete primary super admin",
            // TimetableParserService
            "Unsupported file type. Please upload .xlsx, .xls, or .pdf",
            "No tabular data found in the file."
    );

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                Map.of("error", ex.getMessage(), "timestamp", LocalDateTime.now().toString())
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                Map.of("error", ex.getMessage(), "timestamp", LocalDateTime.now().toString())
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                Map.of("error", message, "timestamp", LocalDateTime.now().toString())
        );
    }

    /**
     * Business logic errors (login failures, duplicate emails, etc.)
     * Only passes through known-safe messages to the client.
     * Unknown/unexpected RuntimeExceptions get a generic message to avoid leaking internals.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntime(RuntimeException ex) {
        String message = ex.getMessage();
        if (message != null && SAFE_MESSAGES.contains(message)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of("error", message, "timestamp", LocalDateTime.now().toString())
            );
        }
        // Unknown RuntimeException — log the real error, return generic message
        log.error("Unexpected RuntimeException: {}", message, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                Map.of("error", "An unexpected error occurred.", "timestamp", LocalDateTime.now().toString())
        );
    }

    /**
     * True unexpected errors — return 500.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                Map.of("error", "An unexpected error occurred.", "timestamp", LocalDateTime.now().toString())
        );
    }
}