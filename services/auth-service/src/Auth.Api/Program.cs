using System.Text;
using Auth.Api.Middleware;
using Auth.Application.Interfaces;
using Auth.Application.Services;
using Auth.Infrastructure.Data;
using Auth.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = Auth.Api.Configuration.StartupSafety.ConnectionString(builder.Configuration);

builder.Services.AddDbContext<AuthDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IAuthService, AuthService>();

var jwtSecret = JwtSafety.RequireSecret(builder.Configuration["JWT_SECRET"]);
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "waypoint-auth";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "waypoint-clients";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(30),
        RoleClaimType = "role",
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireDispatcher", policy => policy.RequireClaim("role", "DISPATCHER"));
    options.AddPolicy("RequireLoader", policy => policy.RequireClaim("role", "LOADER"));
    options.AddPolicy("RequireDriver", policy => policy.RequireClaim("role", "DRIVER"));
    options.AddPolicy("RequireStoreManager", policy => policy.RequireClaim("role", "STORE_MANAGER"));
});

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    await Auth.Api.Configuration.StartupSafety.InitializeAsync(builder.Configuration, app.Environment.IsDevelopment(),
        async () => { await context.Database.EnsureCreatedAsync(); },
        () => DataSeeder.SeedAsync(context),
        async () => {
            if (!await context.Database.CanConnectAsync()) return false;
            await context.Users.AsNoTracking().Select(u => u.Id).Take(1).ToListAsync();
            return true;
        });
}

app.UseMiddleware<GlobalExceptionMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", async (AuthDbContext db, CancellationToken cancellation) =>
    await db.Database.CanConnectAsync(cancellation)
        ? Results.Ok(new { status = "healthy" })
        : Results.StatusCode(503));
app.Run();
