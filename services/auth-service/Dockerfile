FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY Auth.sln .
COPY src/Auth.Api/Auth.Api.csproj src/Auth.Api/
COPY src/Auth.Application/Auth.Application.csproj src/Auth.Application/
COPY src/Auth.Domain/Auth.Domain.csproj src/Auth.Domain/
COPY src/Auth.Infrastructure/Auth.Infrastructure.csproj src/Auth.Infrastructure/
COPY tests/Auth.UnitTests/Auth.UnitTests.csproj tests/Auth.UnitTests/
COPY tests/Auth.IntegrationTests/Auth.IntegrationTests.csproj tests/Auth.IntegrationTests/
RUN dotnet restore --runtime linux-musl-x64

COPY . .
RUN dotnet publish src/Auth.Api/Auth.Api.csproj \
    -c Release \
    -r linux-musl-x64 \
    --no-restore \
    -o /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/publish .

EXPOSE 8080

USER appuser

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "Auth.Api.dll"]

