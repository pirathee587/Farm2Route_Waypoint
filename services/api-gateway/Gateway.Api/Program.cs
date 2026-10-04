using System.Text;
using Gateway.Api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
builder.Host.UseSerilog();

// ── JWT Bearer ────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken            = false;   // Gateway validates only, no identity
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                         Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer           = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.FromSeconds(30),
            // Role claim mapping
            RoleClaimType            = "role",
            NameClaimType            = "sub",
        };

        // Return clean 401/403 JSON — no HTML redirect
        options.Events = new JwtBearerEvents
        {
            OnChallenge = ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode  = StatusCodes.Status401Unauthorized;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    """{"error":"Unauthorized","message":"A valid JWT is required."}""");
            },
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode  = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(
                    """{"error":"Forbidden","message":"You do not have permission for this resource."}""");
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Named "Authenticated" policy — all proxied authenticated routes use this
    // NOTE: "Default" and "Anonymous" are reserved by YARP and cannot be used as policy names.
    options.AddPolicy("Authenticated", policy => policy.RequireAuthenticatedUser());

    // FallbackPolicy — fallback for any route without explicit policy
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// ── CORS ──────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("GatewayCors", policy =>
        policy.WithOrigins(
                builder.Configuration
                       .GetSection("Cors:AllowedOrigins")
                       .Get<string[]>() ?? ["https://localhost"])
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()));

// ── YARP ──────────────────────────────────────────────────────────────────
builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms<Gateway.Api.Config.GatewayTransformProvider>();

// ── Health checks ─────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ────────────────────────────────────────────────────────────────────────
var app = builder.Build();
// ────────────────────────────────────────────────────────────────────────

app.UseSerilogRequestLogging(opts =>
{
    opts.EnrichDiagnosticContext = (diag, ctx) =>
    {
        diag.Set("RequestHost",   ctx.Request.Host.Value);
        diag.Set("RequestScheme", ctx.Request.Scheme);
        diag.Set("UserAgent",     ctx.Request.Headers.UserAgent.ToString());
    };
});

app.UseCors("GatewayCors");

// ── JWT Validation Middleware ──────────────────────────────────────────────
// Runs before YARP forwarding.
// Public routes (login, refresh, health) are whitelisted — skip auth.
// All other routes → JWT must be valid → claims forwarded as headers.
app.UseMiddleware<JwtValidationMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// ── Health endpoint (public — no JWT required) ─────────────────────────────
app.MapHealthChecks("/health").AllowAnonymous();

// ── YARP reverse proxy ────────────────────────────────────────────────────
app.MapReverseProxy();

app.Run();
