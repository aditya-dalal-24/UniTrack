package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpenseSummaryResponse {
    private Double totalSpent;
    private Double averagePerDay;
    private Double highestExpense;
    private Integer totalTransactions;
    private Map<String, Double> categoryBreakdown;
    private List<ExpenseResponse> expenses;
}