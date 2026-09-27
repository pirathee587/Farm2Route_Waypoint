using System.Security.Claims;
using Auth.Domain.Entities;

namespace Auth.Application.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateAccessToken(string token);
    Task<bool> ValidateRefreshTokenAsync(string token, Guid userId);
    Task RevokeRefreshTokenAsync(string token);
}
