package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.ExpenseCategory;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {
    List<ExpenseCategory> findByUser(User user);
    void deleteAllByUser(User user);
}