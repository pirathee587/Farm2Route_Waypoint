using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Gateway.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Gateway.Tests;

public class JwtValidationMiddlewareTests
{
    private const string Secret = "this_is_a_test_secret_that_needs_to_be_long_enough";

    [Fact]
    public async Task ReplacesSpoofedOutletWithValidatedClaim()
    {
        var context = Request("/api/orders", Token("STORE_MANAGER", "OUT001"));
        context.Request.Headers["X-Outlet-Id"] = "SPOOFED";
        context.Request.Headers["X-User-Role"] = "ADMIN";
        var next = new RequestDelegate(ctx =>
        {
            Assert.Equal("OUT001", ctx.Request.Headers["X-Outlet-Id"].ToString());
            Assert.Equal("STORE_MANAGER", ctx.Request.Headers["X-User-Role"].ToString());
            return Task.CompletedTask;
        });

        await Middleware(next).InvokeAsync(context);
    }

    [Fact]
    public async Task NonManagerTokenCannotForwardClientOutlet()
    {
        var context = Request("/api/orders", Token("DISPATCHER", null));
        context.Request.Headers["X-Outlet-Id"] = "SPOOFED";
        var next = new RequestDelegate(ctx =>
        {
            Assert.False(ctx.Request.Headers.ContainsKey("X-Outlet-Id"));
            Assert.Equal("DISPATCHER", ctx.Request.Headers["X-User-Role"].ToString());
            return Task.CompletedTask;
        });

        await Middleware(next).InvokeAsync(context);
    }

    [Fact]
    public async Task PublicRouteDropsClientOutlet()
    {
        var context = Request("/api/auth/login", null);
        context.Request.Headers["X-Outlet-Id"] = "SPOOFED";
        var next = new RequestDelegate(ctx =>
        {
            Assert.False(ctx.Request.Headers.ContainsKey("X-Outlet-Id"));
            return Task.CompletedTask;
        });

        await Middleware(next).InvokeAsync(context);
    }

    private static JwtValidationMiddleware Middleware(RequestDelegate next)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Secret"] = Secret,
            ["Jwt:Issuer"] = "test-issuer",
            ["Jwt:Audience"] = "test-audience"
        }).Build();
        return new JwtValidationMiddleware(next, NullLogger<JwtValidationMiddleware>.Instance, config);
    }

    private static DefaultHttpContext Request(string path, string? token)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        if (token is not null)
        {
            context.Request.Headers.Authorization = "Bearer " + token;
        }
        return context;
    }

    private static string Token(string role, string? outletId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, "f9d8809f-4f01-43b0-88a8-f7a56459fb23"),
            new(JwtRegisteredClaimNames.Email, "manager@waypoint.lk"),
            new("role", role)
        };
        if (outletId is not null) claims.Add(new Claim("outlet_id", outletId));
        var token = new JwtSecurityToken(
            "test-issuer", "test-audience", claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),
                SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
