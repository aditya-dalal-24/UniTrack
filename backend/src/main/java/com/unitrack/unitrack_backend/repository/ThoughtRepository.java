package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Thought;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ThoughtRepository extends JpaRepository<Thought, Long> {
}
