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

// Load env vars
builder.Configuration.AddEnvironmentVariables();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
var dbHost = builder.Configuration["SUPABASE_DB_HOST"];
var dbPort = builder.Configuration["SUPABASE_DB_PORT"];
var dbName = builder.Configuration["SUPABASE_DB_NAME"];
var dbUser = builder.Configuration["SUPABASE_DB_USER"];
var dbPassword = builder.Configuration["SUPABASE_DB_PASSWORD"];

var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Pooling=true;Maximum Pool Size=20;SSL Mode=Require;Trust Server Certificate=true";

builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseNpgsql(connectionString));

// DI
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// JWT Authentication
var jwtSecret = builder.Configuration["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET is missing");
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "waypoint-auth";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "waypoint-clients";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

// Authorization Policies
builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireDispatcher", policy => policy.RequireClaim("role", "DISPATCHER"));
        options.AddPolicy("RequireLoader", policy => policy.RequireClaim("role", "LOADER"));
        options.AddPolicy("RequireDriver", policy => policy.RequireClaim("role", "DRIVER"));
        options.AddPolicy("RequireStoreManager", policy => policy.RequireClaim("role", "STORE_MANAGER"));
    });

var app = builder.Build();

// Seed Database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    try
    {
        context.Database.ExecuteSqlRaw("CREATE SCHEMA IF NOT EXISTS auth_schema;");
        var creator = (RelationalDatabaseCreator)context.Database.GetService<IDatabaseCreator>();
        creator.CreateTables();
    }
    catch
    {
        // Tables already created or schema initialized
    }

    try
    {
        await DataSeeder.SeedAsync(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database seeding notice: {ex.Message}");
    }
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
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
