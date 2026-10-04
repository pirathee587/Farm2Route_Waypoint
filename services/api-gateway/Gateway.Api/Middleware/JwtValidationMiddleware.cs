using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Gateway.Api.Middleware;

/// <summary>
/// JWT Validation Middleware — runs BEFORE YARP forwards the request.
///
/// Flow:
///   1. Check if route is public (whitelist) → skip validation, pass through.
///   2. Extract Bearer token from Authorization header.
///   3. Validate token (signature, issuer, audience, expiry).
///   4. Inject decoded claims as downstream headers so backend services
///      can trust them WITHOUT re-validating the JWT.
///   5. If invalid → return 401 immediately (YARP never sees the request).
/// </summary>
public sealed class JwtValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<JwtValidationMiddleware> _logger;
    private readonly TokenValidationParameters _validationParams;

    // ── Public routes — skip JWT check ────────────────────────────────────
    private static readonly HashSet<string> _publicPrefixes =
    [
        "/api/auth/login",
        "/api/auth/refresh",
        "/api/auth/reset-password",
        "/api/auth/validate",      // internal gateway→auth validation
        "/health",
        "/nginx-health",
    ];

    public JwtValidationMiddleware(
        RequestDelegate next,
        ILogger<JwtValidationMiddleware> logger,
        IConfiguration config)
    {
        _next   = next;
        _logger = logger;

        var secret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret missing");

        _validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                         Encoding.UTF8.GetBytes(secret)),
            ValidateIssuer           = true,
            ValidIssuer              = config["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = config["Jwt:Audience"],
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.FromSeconds(30),
            RoleClaimType            = "role",
            NameClaimType            = "sub",
        };
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Never trust outlet identity supplied by a client, including on public routes.
        context.Request.Headers.Remove("X-Outlet-Id");

        // ── 1. Whitelist check — public routes bypass JWT ─────────────────
        if (IsPublicRoute(path))
        {
            _logger.LogDebug("Public route {Path} — skipping JWT validation", path);
            await _next(context);
            return;
        }

        // ── 2. Extract Bearer token ───────────────────────────────────────
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Missing or malformed Authorization header on {Path}", path);
            await WriteUnauthorized(context, "Missing Authorization header. Expected: Bearer <token>");
            return;
        }

        var token = authHeader["Bearer ".Length..].Trim();

        // ── 3. Validate token ─────────────────────────────────────────────
        ClaimsPrincipal principal;
        try
        {
            var handler = new JwtSecurityTokenHandler
            {
                MapInboundClaims = false   // Keep original claim names (e.g., "role" not "http://...")
            };

            principal = handler.ValidateToken(token, _validationParams, out _);
        }
        catch (SecurityTokenExpiredException ex)
        {
            _logger.LogInformation("Expired token on {Path}: {Message}", path, ex.Message);
            await WriteUnauthorized(context, "Token has expired. Please refresh.");
            return;
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning("Invalid token on {Path}: {Message}", path, ex.Message);
            await WriteUnauthorized(context, "Invalid token.");
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token validation error on {Path}", path);
            await WriteUnauthorized(context, "Token validation failed.");
            return;
        }

        // ── 4. Inject claims as downstream request headers ─────────────────
        // Backend services read these headers — they do NOT need to re-validate JWT.
        // Headers are set after validation so backends can TRUST them.
        var claims = principal.Claims.ToList();

        var userId = GetClaim(claims, "sub");
        var email  = GetClaim(claims, "email");
        var role   = GetClaim(claims, "role");
        var name   = GetClaim(claims, "name");
        var outletId = GetClaim(claims, "outlet_id");

        if (string.IsNullOrEmpty(userId))
        {
            await WriteUnauthorized(context, "Token missing 'sub' claim.");
            return;
        }

        // Remove any existing X-User-* headers (prevent spoofing from clients)
        context.Request.Headers.Remove("X-User-Id");
        context.Request.Headers.Remove("X-User-Email");
        context.Request.Headers.Remove("X-User-Role");
        context.Request.Headers.Remove("X-User-Name");

        // Set validated claims as trusted headers for downstream services
        context.Request.Headers["X-User-Id"]    = userId;
        context.Request.Headers["X-User-Email"] = email;
        context.Request.Headers["X-User-Role"]  = role;
        context.Request.Headers["X-User-Name"]  = name;
        if (!string.IsNullOrWhiteSpace(outletId))
        {
            context.Request.Headers["X-Outlet-Id"] = outletId;
        }

        // Also set the ClaimsPrincipal so ASP.NET authorization policies work
        context.User = principal;

        _logger.LogDebug(
            "JWT valid → User={UserId} Role={Role} Path={Path}",
            userId, role, path);

        // ── 5. Forward to YARP ─────────────────────────────────────────────
        await _next(context);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static bool IsPublicRoute(string path)
        => _publicPrefixes.Any(prefix =>
               path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

    private static string GetClaim(IEnumerable<Claim> claims, string type)
        => claims.FirstOrDefault(c => c.Type == type)?.Value ?? string.Empty;

    private static Task WriteUnauthorized(HttpContext ctx, string message)
    {
        ctx.Response.StatusCode  = StatusCodes.Status401Unauthorized;
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(
            $$"""{"error":"Unauthorized","message":"{{message}}"}""");
    }
}
