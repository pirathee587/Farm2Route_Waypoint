# Order Service - Multi-stage Dockerfile
# Build context is the repository root so the shared protobuf contracts are available.

FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app/services/order-service

COPY services/order-service/pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

COPY services/order-service/src ./src
COPY proto /app/proto
RUN mvn package -DskipTests -B --no-transfer-progress

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY --from=build /app/services/order-service/target/order-service-*.jar app.jar
COPY services/order-service/src/main/resources/data /app/data

EXPOSE 8080 9090

USER appuser

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENV SPRING_PROFILES_ACTIVE=docker
ENV SEED_DATA_PATH=/app/data

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -fs http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
