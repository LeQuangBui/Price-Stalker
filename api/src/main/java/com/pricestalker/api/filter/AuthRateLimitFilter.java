package com.pricestalker.api.filter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Fixed-window, per-client-IP rate limiter for the unauthenticated/credential-bearing auth
 * endpoints. Caps how many times a single IP can hammer a given path within a window, blunting
 * credential stuffing, verification-code/reset-token brute force, and email-send abuse.
 *
 * NOTE: this is a PER-INSTANCE, in-memory limiter keyed on client IP. It does not coordinate
 * across replicas; behind multiple API instances the effective cap is (limit * instance-count).
 * A distributed/Redis-backed limiter is the future upgrade for cluster-wide enforcement.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MILLIS = 60_000L;
    private static final int MAX_REQUESTS_PER_WINDOW = 10;
    // Hard upper bound on tracked keys so a hostile spray of spoofed X-Forwarded-For values
    // (or many distinct IPs) can't grow the map without bound between sweeps. When exceeded we
    // force a sweep; if still over, new keys are not tracked (fail-open on tracking, never on cap).
    private static final int MAX_TRACKED_KEYS = 100_000;

    private static final Set<String> RATE_LIMITED_PATHS = Set.of(
        "/auth/login",
        "/auth/signup",                        // account-creation sends a verification email — throttle abuse
        "/auth/email-verification/verify",     // the actual 6-digit code-guessing endpoint
        "/auth/email-verification/resend",
        "/auth/password-reset/request",
        "/auth/password-reset/confirm"
    );

    private final ConcurrentHashMap<String, Window> counters = new ConcurrentHashMap<>();

    private static final class Window {
        // windowStart is the epoch-millis start of the current fixed window for this key.
        volatile long windowStart;
        final AtomicInteger count = new AtomicInteger(0);

        Window(long windowStart) {
            this.windowStart = windowStart;
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!isRateLimited(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        sweepIfNeeded(now);

        String key = clientIp(request) + "|" + request.getRequestURI();
        int observed = recordAndCount(key, now);

        if (observed > MAX_REQUESTS_PER_WINDOW) {
            writeTooManyRequests(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod())
            && RATE_LIMITED_PATHS.contains(request.getRequestURI());
    }

    /**
     * Atomically record one hit for the key in the current window and return the post-increment
     * count. If the stored window has expired it is reset to a fresh window starting now.
     */
    private int recordAndCount(String key, long now) {
        if (counters.size() >= MAX_TRACKED_KEYS && !counters.containsKey(key)) {
            // Saturated with active windows (the sweep already ran this request). Fail CLOSED for new
            // keys: a 100k-distinct-key flood is itself abusive, and treating untracked keys as allowed
            // would disable the limiter exactly when it's under attack. (Cheap spoofed-key sprays are
            // already neutralized by keying on the trusted last X-Forwarded-For hop below.)
            return MAX_REQUESTS_PER_WINDOW + 1;
        }

        Window window = counters.computeIfAbsent(key, k -> new Window(now));

        synchronized (window) {
            if (now - window.windowStart >= WINDOW_MILLIS) {
                window.windowStart = now;
                window.count.set(0);
            }
            return window.count.incrementAndGet();
        }
    }

    /**
     * Drop entries whose window has fully elapsed so the map can't grow unbounded over time.
     * Cheap and only triggered for rate-limited paths; relies on the fixed window so an entry is
     * safe to evict once it is older than one window.
     */
    private void sweepIfNeeded(long now) {
        for (Map.Entry<String, Window> entry : counters.entrySet()) {
            Window window = entry.getValue();
            if (now - window.windowStart >= WINDOW_MILLIS) {
                // Remove only if still expired at removal time (guards against a concurrent reset).
                counters.computeIfPresent(entry.getKey(), (k, w) ->
                    (now - w.windowStart >= WINDOW_MILLIS) ? null : w);
            }
        }
    }

    private String clientIp(HttpServletRequest request) {
        // Use the LAST X-Forwarded-For hop, NOT the first. Our single trusted proxy (Caddy) appends
        // the real client IP, so the rightmost entry is attacker-uncontrollable; the leftmost entries
        // are client-supplied and spoofable — keying on them would let one attacker mint unlimited
        // buckets and sail past the cap. NOTE: assumes exactly one trusted proxy; add a hop if a
        // CDN/LB is ever placed in front of Caddy.
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            String lastHop = hops[hops.length - 1].trim();
            if (!lastHop.isEmpty()) {
                return lastHop;
            }
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
    }
}
