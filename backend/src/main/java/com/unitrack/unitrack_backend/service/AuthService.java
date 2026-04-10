package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.*;
import com.unitrack.unitrack_backend.dto.response.AuthResponse;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.repository.UserRepository;
import com.unitrack.unitrack_backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .college(request.getCollege())
                .course(request.getCourse())
                .semester(request.getSemester())
                .dob(request.getDob())
                .emailVerified(false)
                .build();

        userRepository.save(user);

        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_USER")
                .build();

        String token = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_USER")
                .build();

        String token = jwtService.generateToken(userDetails);
        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }
}