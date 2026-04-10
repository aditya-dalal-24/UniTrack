package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Profile;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
    Optional<Profile> findByUser(User user);
}