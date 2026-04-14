package com.unitrack.unitrack_backend.security;

import com.unitrack.unitrack_backend.entity.Role;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Value("${app.super-admin-email}")
    private String superAdminEmail;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // Block inactive users
        if (!user.isActive()) {
            throw new UsernameNotFoundException("Account is deactivated. Contact admin.");
        }

        // Build authorities based on role
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        Role effectiveRole = getEffectiveRole(user);

        switch (effectiveRole) {
            case SUPER_ADMIN:
            case BOTH:
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                authorities.add(new SimpleGrantedAuthority("ROLE_STUDENT"));
                break;
            case ADMIN:
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                break;
            case STUDENT:
            default:
                authorities.add(new SimpleGrantedAuthority("ROLE_STUDENT"));
                break;
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword() != null ? user.getPassword() : "")
                .authorities(authorities)
                .build();
    }

    /**
     * Super admin email always gets SUPER_ADMIN role regardless of DB value.
     */
    private Role getEffectiveRole(User user) {
        if (user.getEmail().equalsIgnoreCase(superAdminEmail)) {
            return Role.SUPER_ADMIN;
        }
        return user.getRole();
    }
}