package com.pricestalker.api.filter;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.pricestalker.api.security.MyUserDetailsService;
import com.pricestalker.api.security.UserPrincipal;
import com.pricestalker.api.util.JwtUtil;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final MyUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
        JwtUtil jwtUtil,
        MyUserDetailsService userDetailsService
    ) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                String username = jwtUtil.extractUsername(token);

                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // Fail closed: the token must (a) carry a valid signature + not be expired,
                    // (b) name the exact user we just loaded (validate against the persisted
                    // username, not a value re-derived from the same token), and (c) match the
                    // user's current token version (so tokens minted before a password reset are
                    // rejected). Any mismatch leaves the context unauthenticated.
                    boolean userMatches = jwtUtil.validateToken(token, userDetails.getUsername());
                    boolean versionMatches = false;
                    if (userDetails instanceof UserPrincipal principal) {
                        versionMatches = jwtUtil.extractTokenVersion(token) == principal.getTokenVersion();
                    }

                    if (userMatches && versionMatches) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    } else {
                        SecurityContextHolder.clearContext();
                    }
                }
            } catch (io.jsonwebtoken.JwtException | IllegalArgumentException
                     | org.springframework.security.core.userdetails.UsernameNotFoundException invalidToken) {
                // Swallow ONLY token/identity failures (malformed/expired/forged token, or a token for a
                // since-deleted user): stay unauthenticated -> clean 401. A transient infra error (e.g. a
                // DB blip inside loadUserByUsername) is deliberately NOT caught here, so it surfaces as a
                // 500 instead of silently logging a valid user out during the blip.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }
}
