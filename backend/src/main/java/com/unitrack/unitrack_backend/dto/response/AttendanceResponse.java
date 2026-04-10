package com.unitrack.unitrack_backend.dto.response;

import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AttendanceResponse {
    private Long id;
    private LocalDate date;
    private AttendanceStatus status;
    private String note;
}