# ═══════════════════════════════════════════════════════════════════════════
#  Planning Service — Multi-stage Dockerfile
#  Maven build (Java 21) → Eclipse Temurin JRE 21 minimal runtime
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Maven Build ──────────────────────────────────────────────────
# The gRPC Java protoc plugin is a glibc executable; use the Debian-based
# Maven image so it can run during source generation.
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first for dependency layer caching
COPY services/planning-service/pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

# Copy source and the shared protobuf contracts used by the Maven generator.
COPY services/planning-service/src ./src
COPY proto /proto

# Package — skip tests in Docker build (run in CI separately)
RUN mvn package -DskipTests -B --no-transfer-progress

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# curl for healthcheck
RUN apk add --no-cache curl

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the fat JAR produced by Spring Boot maven plugin
COPY --from=build /app/target/planning-service-*.jar app.jar

EXPOSE 8080
# gRPC port
EXPOSE 9090

USER appuser

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENV SPRING_PROFILES_ACTIVE=docker

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -fs http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
