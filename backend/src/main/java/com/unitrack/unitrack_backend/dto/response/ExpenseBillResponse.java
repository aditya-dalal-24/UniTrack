package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpenseBillResponse {
    private LocalDate date;
    private Double totalAmount;
    private List<ExpenseResponse> expenses;
}
