package com.waypoint.planning.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

public final class DatabaseTlsGuard implements EnvironmentPostProcessor, Ordered {
    public int getOrder() { return Ordered.LOWEST_PRECEDENCE; }
    public static boolean strictlyVerified(String jdbcUrl) {
        if (jdbcUrl == null || !jdbcUrl.startsWith("jdbc:postgresql://")) return false;
        try {
            String query = URI.create(jdbcUrl.substring(5)).getRawQuery();
            if (query == null) return false;
            int modes = 0;
            for (String field : query.split("&")) {
                String[] kv = field.split("=", 2);
                String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
                String value = kv.length == 2 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
                if (key.equalsIgnoreCase("sslfactory") || key.equalsIgnoreCase("sslhostnameverifier")) return false;
                if (key.equalsIgnoreCase("sslmode")) {
                    if (!value.equals("verify-full")) return false;
                    modes++;
                }
            }
            return modes == 1;
        } catch (IllegalArgumentException ex) { return false; }
    }
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        boolean isolated = Arrays.stream(env.getActiveProfiles()).anyMatch(p -> p.equals("test") || p.equals("local"));
        if (!isolated && !strictlyVerified(env.getProperty("spring.datasource.url")))
            throw new IllegalStateException("PostgreSQL requires sslmode=verify-full without custom TLS bypass factories");
    }
}
