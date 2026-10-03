package com.waypoint.order.config;
import jakarta.servlet.*;import jakarta.servlet.http.*;import org.springframework.stereotype.Component;import java.io.IOException;
@Component public class GatewayFilter implements Filter {
 public void doFilter(ServletRequest a,ServletResponse b,FilterChain c)throws IOException,ServletException{var r=(HttpServletRequest)a;var w=(HttpServletResponse)b;if(r.getRequestURI().startsWith("/api/")&&!"true".equalsIgnoreCase(r.getHeader("X-Gateway-Verified"))){w.setStatus(401);w.setContentType("application/json");w.getWriter().write("{\"code\":\"UNTRUSTED_GATEWAY\"}");return;}c.doFilter(a,b);}
}
