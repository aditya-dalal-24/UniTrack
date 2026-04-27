package com.unitrack.unitrack_backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class DailyGroup {
    private LocalDate date;
    private String dayOfWeek;
    private List<ExpenseResponse> expenses;
    private double dailyTotal;
}
