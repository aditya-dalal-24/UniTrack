package com.unitrack.unitrack_backend.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String name;
    private String email;
    private Long userId;
    private String gender;
    private Integer semester;
    private boolean emailVerified;
    private String role;
}