# ═══════════════════════════════════════════════════════════════════════════
#  API Gateway — Multi-stage Dockerfile
#  .NET 8 SDK build → ASP.NET 8 runtime (YARP reverse proxy)
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Restore & Build ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy project file for layer-cached restore
COPY Gateway.Api/Gateway.Api.csproj Gateway.Api/

RUN dotnet restore Gateway.Api/Gateway.Api.csproj --runtime linux-musl-x64

# Copy full source
COPY . .

# Publish
RUN dotnet publish Gateway.Api/Gateway.Api.csproj \
    -c Release \
    -r linux-musl-x64 \
    --no-restore \
    -o /app/publish \
    /p:UseAppHost=false

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# curl for healthcheck
RUN apk add --no-cache curl

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/publish .

EXPOSE 8080

USER appuser

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -fs http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "Gateway.Api.dll"]
