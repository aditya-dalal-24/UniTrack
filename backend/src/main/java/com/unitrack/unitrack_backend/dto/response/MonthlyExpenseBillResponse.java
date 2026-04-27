package com.unitrack.unitrack_backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class MonthlyExpenseBillResponse {
    private String month;
    private int year;
    private double totalSpent;
    private double averageDailySpend;
    private LocalDate highestExpenseDay;
    private double highestExpenseAmount;
    private List<DailyGroup> dailyGroups;
}
