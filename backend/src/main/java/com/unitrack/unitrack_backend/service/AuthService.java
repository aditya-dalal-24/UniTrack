package com.unitrack.unitrack_backend.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.unitrack.unitrack_backend.dto.request.*;
import com.unitrack.unitrack_backend.dto.response.AuthResponse;
import com.unitrack.unitrack_backend.entity.AuthProvider;
import com.unitrack.unitrack_backend.entity.Role;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.repository.UserRepository;
import com.unitrack.unitrack_backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${google.client-id}")
    private String googleClientId;

    @Value("${app.super-admin-email}")
    private String superAdminEmail;

    // ==================== REGISTER (with OTP) ====================

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        String otp = generateOtp();

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .college(request.getCollege())
                .course(request.getCourse())
                .semester(request.getSemester())
                .dob(request.getDob())
                .gender(request.getGender())
                .emailVerified(false)
                .authProvider(AuthProvider.LOCAL)
                .role(Role.STUDENT)
                .isActive(true)
                .verificationOtp(otp)
                .otpExpiry(LocalDateTime.now().plusMinutes(10))
                .build();

        userRepository.save(user);

        // Send OTP email
        emailService.sendOtpEmail(user.getEmail(), otp, user.getName());

        // Return response WITHOUT token — user must verify email first
        return AuthResponse.builder()
                .token(null)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .gender(user.getGender())
                .emailVerified(false)
                .role(Role.STUDENT.name())
                .build();
    }

    // ==================== LOGIN ====================

    public AuthResponse login(LoginRequest request) {
        // Find user first to check verification status
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        // Check if account is deactivated
        if (!user.isActive()) {
            throw new RuntimeException("Your account has been deactivated. Please contact an administrator.");
        }

        // Check if this is a Google-only user
        if (user.getAuthProvider() == AuthProvider.GOOGLE && user.getPassword() == null) {
            throw new RuntimeException("This account uses Google Sign-In. Please use the Google button to log in.");
        }

        // Check email verification for LOCAL users
        if (user.getAuthProvider() == AuthProvider.LOCAL && !user.isEmailVerified()) {
            // Resend OTP automatically
            String otp = generateOtp();
            user.setVerificationOtp(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
            userRepository.save(user);
            emailService.sendOtpEmail(user.getEmail(), otp, user.getName());

            return AuthResponse.builder()
                    .token(null)
                    .name(user.getName())
                    .email(user.getEmail())
                    .userId(user.getId())
                    .gender(user.getGender())
                    .emailVerified(false)
                    .role(getEffectiveRole(user).name())
                    .build();
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        String effectiveRole = getEffectiveRole(user).name();

        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_USER")
                .build();

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", effectiveRole);

        String token = jwtService.generateToken(claims, userDetails);
        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .gender(user.getGender())
                .emailVerified(true)
                .role(effectiveRole)
                .build();
    }

    // ==================== VERIFY EMAIL ====================

    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        if (user.getVerificationOtp() == null || user.getOtpExpiry() == null) {
            throw new RuntimeException("No verification code found. Please request a new one.");
        }

        if (LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("Verification code has expired. Please request a new one.");
        }

        if (!user.getVerificationOtp().equals(request.getOtp())) {
            throw new RuntimeException("Invalid verification code");
        }

        // Mark email as verified and clear OTP
        user.setEmailVerified(true);
        user.setVerificationOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        String effectiveRole = getEffectiveRole(user).name();

        // Generate JWT token
        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_USER")
                .build();

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", effectiveRole);

        String token = jwtService.generateToken(claims, userDetails);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .gender(user.getGender())
                .emailVerified(true)
                .role(effectiveRole)
                .build();
    }

    // ==================== RESEND OTP ====================

    public AuthResponse resendOtp(ResendOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        String otp = generateOtp();
        user.setVerificationOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        emailService.sendOtpEmail(user.getEmail(), otp, user.getName());

        return AuthResponse.builder()
                .token(null)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .gender(user.getGender())
                .emailVerified(false)
                .role(getEffectiveRole(user).name())
                .build();
    }

    // ==================== GOOGLE LOGIN ====================

    public AuthResponse googleLogin(GoogleAuthRequest request) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(request.getIdToken());
        } catch (Exception e) {
            log.error("Google token verification failed: {}", e.getMessage());
            throw new RuntimeException("Invalid Google token");
        }

        if (idToken == null) {
            throw new RuntimeException("Invalid Google token");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String name = (String) payload.get("name");

        if (name == null || name.isBlank()) {
            name = email.split("@")[0];
        }

        // Find existing user or create new one
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // Create new Google user
            user = User.builder()
                    .name(name)
                    .email(email)
                    .password(null)
                    .authProvider(AuthProvider.GOOGLE)
                    .emailVerified(true)  // Google emails are pre-verified
                    .role(Role.STUDENT)
                    .isActive(true)
                    .build();
            userRepository.save(user);
        } else if (user.getAuthProvider() == AuthProvider.LOCAL) {
            // Existing LOCAL user signing in with Google — link accounts
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        // Check if account is deactivated
        if (!user.isActive()) {
            throw new RuntimeException("Your account has been deactivated. Please contact an administrator.");
        }

        String effectiveRole = getEffectiveRole(user).name();

        // Generate JWT
        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword() != null ? user.getPassword() : "")
                .authorities("ROLE_USER")
                .build();

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", effectiveRole);

        String token = jwtService.generateToken(claims, userDetails);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .gender(user.getGender())
                .emailVerified(true)
                .role(effectiveRole)
                .build();
    }

    // ==================== HELPERS ====================

    private String generateOtp() {
        return String.format("%06d", new Random().nextInt(999999));
    }

    /**
     * Super admin email always returns SUPER_ADMIN, regardless of DB value.
     */
    private Role getEffectiveRole(User user) {
        if (user.getEmail().equalsIgnoreCase(superAdminEmail)) {
            return Role.SUPER_ADMIN;
        }
        return user.getRole();
    }
}