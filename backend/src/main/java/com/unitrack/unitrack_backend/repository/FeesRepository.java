package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Fees;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeesRepository extends JpaRepository<Fees, Long> {
    List<Fees> findByUser(User user);
    List<Fees> findByUserAndSemester(User user, Integer semester);
    void deleteAllByUser(User user);
}