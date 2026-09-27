# ═══════════════════════════════════════════════════════════════════════════
#  Order Service — Multi-stage Dockerfile
#  Maven build (Java 21) → Eclipse Temurin JRE 21 minimal runtime
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Maven Build ──────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Layer cache: restore dependencies before copying source
COPY pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

# Copy source
COPY src ./src

# Build (skip unit tests; run in CI)
RUN mvn package -DskipTests -B --no-transfer-progress

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# curl for healthcheck
RUN apk add --no-cache curl

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy Spring Boot fat JAR
COPY --from=build /app/target/order-service-*.jar app.jar

# Create directory for mounted CSV seed data
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

EXPOSE 8080
# gRPC port
EXPOSE 9090

USER appuser

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENV SPRING_PROFILES_ACTIVE=docker
ENV SEED_DATA_PATH=/app/data

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -fs http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
