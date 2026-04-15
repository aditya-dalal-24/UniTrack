package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Expense;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserOrderByDateDescTimeDesc(User user);
    List<Expense> findByUserAndDateBetweenOrderByDateDescTimeDesc(User user, LocalDate start, LocalDate end);
    void deleteAllByUser(User user);
}