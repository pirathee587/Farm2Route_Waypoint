using Auth.Domain.Entities;

namespace Auth.Application.Interfaces;

/// <summary>
/// Repository interface for User persistence.
/// Implemented in Auth.Infrastructure — never referenced from Auth.Api.
/// </summary>
public interface IUserRepository
{
    Task<ApplicationUser?> GetByEmailAsync(string email);
    Task<ApplicationUser?> GetByIdAsync(string userId);
    Task<bool> ExistsAsync(string email);
    Task CreateAsync(ApplicationUser user, string password);
    Task UpdateAsync(ApplicationUser user);
    Task<string?> GetRefreshTokenAsync(string userId);
    Task SetRefreshTokenAsync(string userId, string refreshToken, DateTime expiry);
    Task RevokeRefreshTokenAsync(string userId, string refreshToken);
}
