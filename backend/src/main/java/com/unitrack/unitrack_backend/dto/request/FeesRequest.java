package com.unitrack.unitrack_backend.dto.request;

import com.unitrack.unitrack_backend.entity.FeesStatus;
import lombok.Data;
import java.time.LocalDate;

@Data
public class FeesRequest {
    private Integer semester;
    private String category;
    private Double totalAmount;
    private Double paidAmount;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private FeesStatus status;
}