package com.unitrack.unitrack_backend.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    // Simple fixed window rate limiting
    private final Map<String, AtomicInteger> requestCounts = new ConcurrentHashMap<>();
    private volatile long currentWindowStart = System.currentTimeMillis();
    
    // 15 requests per second per IP/User limits spam while allowing normal UI flows
    private static final long WINDOW_SIZE_MS = 1000;
    private static final int MAX_REQUESTS_PER_WINDOW = 15;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        long now = System.currentTimeMillis();
        
        // Reset the window every second
        if (now - currentWindowStart > WINDOW_SIZE_MS) {
            synchronized (this) {
                if (now - currentWindowStart > WINDOW_SIZE_MS) {
                    requestCounts.clear();
                    currentWindowStart = now;
                }
            }
        }
        
        String clientId = request.getUserPrincipal() != null 
            ? request.getUserPrincipal().getName() 
            : request.getRemoteAddr();
            
        if (clientId == null) {
            clientId = "unknown";
        }

        // Ignore static/actuator paths
        String path = request.getRequestURI();
        if (path.startsWith("/api/health") || path.startsWith("/actuator")) {
            return true;
        }

        int currentCount = requestCounts.computeIfAbsent(clientId, k -> new AtomicInteger(0)).incrementAndGet();

        if (currentCount > MAX_REQUESTS_PER_WINDOW) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value()); // 429
            response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
            response.setContentType("application/json");
            return false;
        }

        return true;
    }
}
