package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.ExpenseCategoryRequest;
import com.unitrack.unitrack_backend.dto.request.ExpenseRequest;
import com.unitrack.unitrack_backend.dto.response.ExpenseCategoryResponse;
import com.unitrack.unitrack_backend.dto.response.ExpenseResponse;
import com.unitrack.unitrack_backend.dto.response.ExpenseSummaryResponse;
import com.unitrack.unitrack_backend.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping("/categories")
    public ResponseEntity<List<ExpenseCategoryResponse>> getCategories(Principal principal) {
        return ResponseEntity.ok(expenseService.getCategories(principal));
    }

    @PostMapping("/categories")
    public ResponseEntity<ExpenseCategoryResponse> addCategory(Principal principal,
                                                               @Valid @RequestBody ExpenseCategoryRequest request) {
        return ResponseEntity.ok(expenseService.addCategory(principal, request));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(Principal principal, @PathVariable Long id) {
        expenseService.deleteCategory(principal, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<ExpenseSummaryResponse> getSummary(
            Principal principal,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(expenseService.getSummary(principal, month, year));
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(Principal principal,
                                                  @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(expenseService.create(principal, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        expenseService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bill")
    public ResponseEntity<com.unitrack.unitrack_backend.dto.response.ExpenseBillResponse> getDailyBill(
            Principal principal,
            @RequestParam String date) {
        LocalDate localDate = LocalDate.parse(date);
        return ResponseEntity.ok(expenseService.getDailyBill(principal, localDate));
    }
}