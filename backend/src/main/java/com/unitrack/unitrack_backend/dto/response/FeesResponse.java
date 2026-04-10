package com.unitrack.unitrack_backend.dto.response;

import com.unitrack.unitrack_backend.entity.FeesStatus;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FeesResponse {
    private Long id;
    private Integer semester;
    private String category;
    private Double totalAmount;
    private Double paidAmount;
    private Double pendingAmount;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private FeesStatus status;
}