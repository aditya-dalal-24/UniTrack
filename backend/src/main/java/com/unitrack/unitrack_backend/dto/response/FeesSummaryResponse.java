package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FeesSummaryResponse {
    private Double totalFees;
    private Double totalPaid;
    private Double totalPending;
    private Integer currentSemester;
    private List<FeesResponse> fees;
}