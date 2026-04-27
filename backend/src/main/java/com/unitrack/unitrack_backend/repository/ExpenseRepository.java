package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Expense;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserOrderByDateDescTimeDesc(User user);
    Page<Expense> findByUserOrderByDateDescTimeDesc(User user, Pageable pageable);
    
    List<Expense> findByUserAndDateBetweenOrderByDateDescTimeDesc(User user, LocalDate start, LocalDate end);
    List<Expense> findByUserAndDateBetweenOrderByDateAscTimeAsc(User user, LocalDate start, LocalDate end);
    Page<Expense> findByUserAndDateBetweenOrderByDateDescTimeDesc(User user, LocalDate start, LocalDate end, Pageable pageable);
    
    List<Expense> findByUserAndDateOrderByTimeAsc(User user, LocalDate date);
    void deleteAllByUser(User user);
    
    // Aggregated expenses query for dashboard (PostgreSQL-compatible)
    @Query(value = "SELECT EXTRACT(MONTH FROM e.date) AS month, " +
           "EXTRACT(YEAR FROM e.date) AS year, " +
           "SUM(e.amount) AS total " +
           "FROM expenses e WHERE e.user_id = :userId AND e.date >= :startDate " +
           "GROUP BY EXTRACT(YEAR FROM e.date), EXTRACT(MONTH FROM e.date) " +
           "ORDER BY year, month",
           nativeQuery = true)
    List<Object[]> getMonthlyAggregatedExpenses(@Param("userId") Long userId, @Param("startDate") LocalDate startDate);
}