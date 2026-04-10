package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.ExpenseCategoryRequest;
import com.unitrack.unitrack_backend.dto.request.ExpenseRequest;
import com.unitrack.unitrack_backend.dto.response.ExpenseCategoryResponse;
import com.unitrack.unitrack_backend.dto.response.ExpenseResponse;
import com.unitrack.unitrack_backend.dto.response.ExpenseSummaryResponse;
import com.unitrack.unitrack_backend.entity.Expense;
import com.unitrack.unitrack_backend.entity.ExpenseCategory;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.ExpenseCategoryRepository;
import com.unitrack.unitrack_backend.repository.ExpenseRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private ExpenseResponse mapToResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .amount(expense.getAmount())
                .categoryName(expense.getCategory() != null ? expense.getCategory().getName() : null)
                .categoryId(expense.getCategory() != null ? expense.getCategory().getId() : null)
                .date(expense.getDate())
                .time(expense.getTime())
                .note(expense.getNote())
                .build();
    }

    // Category methods
    public List<ExpenseCategoryResponse> getCategories(Principal principal) {
        User user = getUser(principal);
        return categoryRepository.findByUser(user).stream()
                .map(c -> ExpenseCategoryResponse.builder()
                        .id(c.getId()).name(c.getName()).build())
                .collect(Collectors.toList());
    }

    public ExpenseCategoryResponse addCategory(Principal principal, ExpenseCategoryRequest request) {
        User user = getUser(principal);
        ExpenseCategory category = ExpenseCategory.builder()
                .user(user)
                .name(request.getName())
                .build();
        categoryRepository.save(category);
        return ExpenseCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .build();
    }

    public void deleteCategory(Principal principal, Long id) {
        User user = getUser(principal);
        ExpenseCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        categoryRepository.delete(category);
    }

    // Expense methods
    public ExpenseSummaryResponse getSummary(Principal principal, Integer month, Integer year) {
        User user = getUser(principal);

        List<Expense> expenses;
        if (month != null && year != null) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            expenses = expenseRepository.findByUserAndDateBetweenOrderByDateDescTimeDesc(user, start, end);
        } else {
            expenses = expenseRepository.findByUserOrderByDateDescTimeDesc(user);
        }

        double total = expenses.stream().mapToDouble(Expense::getAmount).sum();
        double highest = expenses.stream().mapToDouble(Expense::getAmount).max().orElse(0.0);

        // Calculate unique days for average
        long uniqueDays = expenses.stream()
                .filter(e -> e.getDate() != null)
                .map(Expense::getDate)
                .distinct().count();
        double average = uniqueDays > 0 ? total / uniqueDays : 0.0;

        // Category breakdown
        Map<String, Double> breakdown = expenses.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCategory() != null ? e.getCategory().getName() : "Uncategorized",
                        Collectors.summingDouble(Expense::getAmount)
                ));

        List<ExpenseResponse> responses = expenses.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ExpenseSummaryResponse.builder()
                .totalSpent(Math.round(total * 100.0) / 100.0)
                .averagePerDay(Math.round(average * 100.0) / 100.0)
                .highestExpense(Math.round(highest * 100.0) / 100.0)
                .totalTransactions(expenses.size())
                .categoryBreakdown(breakdown)
                .expenses(responses)
                .build();
    }

    public ExpenseResponse create(Principal principal, ExpenseRequest request) {
        User user = getUser(principal);

        ExpenseCategory category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        Expense expense = Expense.builder()
                .user(user)
                .category(category)
                .amount(request.getAmount())
                .date(request.getDate() != null ? request.getDate() : LocalDate.now())
                .time(request.getTime() != null ? request.getTime() : LocalTime.now())
                .note(request.getNote())
                .build();
        expenseRepository.save(expense);
        return mapToResponse(expense);
    }

    public void delete(Principal principal, Long id) {
        User user = getUser(principal);
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        if (!expense.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        expenseRepository.delete(expense);
    }
}