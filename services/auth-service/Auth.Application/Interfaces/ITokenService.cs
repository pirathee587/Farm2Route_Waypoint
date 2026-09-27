using Auth.Application.DTOs;

namespace Auth.Application.Interfaces;

/// <summary>
/// Token and authentication orchestration service.
/// Sits in the Application layer — no direct DB or JWT library dependencies.
/// </summary>
public interface ITokenService
{
    /// <summary>Authenticate user credentials and return tokens.</summary>
    Task<LoginResponse?> LoginAsync(LoginRequest request);

    /// <summary>Validate a raw JWT string; returns claims or null if invalid.</summary>
    Task<ValidateTokenResponse> ValidateTokenAsync(string token);

    /// <summary>Issue a new access token using a valid refresh token.</summary>
    Task<LoginResponse?> RefreshAsync(string refreshToken);

    /// <summary>Send a password reset email; silent if email not found.</summary>
    Task InitiatePasswordResetAsync(string email);

    /// <summary>Get the user profile for the given user ID.</summary>
    Task<UserProfileResponse?> GetUserProfileAsync(string userId);

    /// <summary>Revoke a refresh token (logout).</summary>
    Task RevokeRefreshTokenAsync(string refreshToken);
}
