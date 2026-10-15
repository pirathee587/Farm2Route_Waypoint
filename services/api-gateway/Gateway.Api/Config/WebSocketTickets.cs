using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Gateway.Api.Config;

public static class WebSocketTickets
{
    public const string Path = "/api/notify/ws";
    public const string Audience = "waypoint-websocket";
    public const string ProtocolPrefix = "waypoint.ticket.";

    public static bool OriginAllowed(string origin, IConfiguration config) =>
        !string.IsNullOrEmpty(origin) && (config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .Contains(origin, StringComparer.Ordinal);

    public static string Issue(ClaimsPrincipal user, IConfiguration config)
    {
        var claims = user.Claims.Where(c => new[] { "sub", "email", "role", "name", "outlet_id" }.Contains(c.Type)).ToList();
        claims.Add(new Claim("purpose", "websocket"));
        claims.Add(new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")));
        var token = new JwtSecurityToken(config["Jwt:Issuer"], Audience, claims,
            notBefore: DateTime.UtcNow, expires: DateTime.UtcNow.AddSeconds(30),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(JwtSafety.RequireSecret(config["Jwt:Secret"]))), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
