package com.waypoint.planning.config;

import jakarta.servlet.*;import jakarta.servlet.http.*;import org.springframework.stereotype.Component;import org.springframework.web.filter.OncePerRequestFilter;import java.io.IOException;

@Component
public class GatewayTrustFilter extends OncePerRequestFilter {
  @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{if(req.getRequestURI().startsWith("/api/planning/")&&!"true".equalsIgnoreCase(req.getHeader("X-Gateway-Verified"))){res.setStatus(401);res.setContentType("application/json");res.getWriter().write("{\"code\":\"GATEWAY_UNVERIFIED\",\"message\":\"Trusted gateway header required\"}");return;}chain.doFilter(req,res);}
  public static void requireDispatcher(HttpServletRequest req){if(!"DISPATCHER".equalsIgnoreCase(req.getHeader("X-User-Role")))throw new ForbiddenException();}
  public static class ForbiddenException extends RuntimeException{}
}
