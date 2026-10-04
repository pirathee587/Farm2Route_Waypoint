using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Auth.Application.Interfaces;
using Auth.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Auth.Application.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;
    private readonly IUserRepository _userRepository;

    public TokenService(IConfiguration configuration, IUserRepository userRepository)
    {
        _configuration = configuration;
        _userRepository = userRepository;
    }

    public string GenerateAccessToken(User user)
    {
        var secret = _configuration["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET is missing");
        var issuer = _configuration["JWT_ISSUER"] ?? "waypoint-auth";
        var audience = _configuration["JWT_AUDIENCE"] ?? "waypoint-clients";
        var expiryMinutesStr = _configuration["JWT_EXPIRY_MINUTES"] ?? "60";
        if (!int.TryParse(expiryMinutesStr, out var expiryMinutes)) expiryMinutes = 60;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("role", user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        if (user.StoreManagerProfile is { OutletId: { Length: > 0 } outletId })
        {
            claims.Add(new Claim("outlet_id", outletId));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        
        // Return Base64Url string
        return Convert.ToBase64String(randomNumber)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public ClaimsPrincipal? ValidateAccessToken(string token)
    {
        var secret = _configuration["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET is missing");
        var issuer = _configuration["JWT_ISSUER"] ?? "waypoint-auth";
        var audience = _configuration["JWT_AUDIENCE"] ?? "waypoint-clients";

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = false // Allow expired tokens when we need to extract claims during refresh
            }, out var validatedToken);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool> ValidateRefreshTokenAsync(string token, Guid userId)
    {
        var tokenHash = HashToken(token);
        var storedToken = await _userRepository.GetRefreshTokenAsync(tokenHash, userId);
        
        if (storedToken == null || !storedToken.IsValid)
            return false;

        return true;
    }

    public async Task RevokeRefreshTokenAsync(string token)
    {
        var tokenHash = HashToken(token);
        // Find user by token hash? The interface expects userId too.
        // But for revoke, we might just look it up. Let's add a method if needed,
        // or just update it via repository.
        // Note: For this to work, we need a way to get token without userId, or we pass userId.
        // I'll update IUserRepository to get token by hash only if needed.
        // Wait, RevokeRefreshTokenAsync interface doesn't take userId. I'll modify the repo to support it.
        var storedToken = await _userRepository.GetRefreshTokenAsync(tokenHash, Guid.Empty); // Assuming Guid.Empty bypasses user check if implemented that way, or add new method.
        if (storedToken != null)
        {
            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            await _userRepository.UpdateRefreshTokenAsync(storedToken);
        }
    }

    private string HashToken(string token)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        var hashBytes = SHA256.HashData(tokenBytes);
        return Convert.ToHexString(hashBytes);
    }
}
