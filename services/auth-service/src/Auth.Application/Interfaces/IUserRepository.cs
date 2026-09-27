using Auth.Domain.Entities;

namespace Auth.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User> CreateAsync(User user);
    Task UpdateAsync(User user);
    Task<RefreshToken?> GetRefreshTokenAsync(string tokenHash, Guid userId);
    Task AddRefreshTokenAsync(RefreshToken token);
    Task UpdateRefreshTokenAsync(RefreshToken token);
    Task AddPasswordResetTokenAsync(PasswordResetToken token);
    Task<PasswordResetToken?> GetPasswordResetTokenAsync(string tokenHash);
    Task UpdatePasswordResetTokenAsync(PasswordResetToken token);
    Task RevokeAllRefreshTokensForUserAsync(Guid userId);
}
