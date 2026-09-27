using System.Security.Cryptography;
using System.Text;
using Auth.Application.DTOs.Request;
using Auth.Application.DTOs.Response;
using Auth.Application.Exceptions;
using Auth.Application.Interfaces;
using Auth.Domain.Entities;
using Auth.Domain.Enums;
using Microsoft.Extensions.Configuration;

namespace Auth.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordService _passwordService;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IPasswordService passwordService,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _passwordService = passwordService;
        _configuration = configuration;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant());
        if (user == null)
            throw new UnauthorizedException("Invalid credentials");

        if (user.Status != UserStatus.active)
            throw new UnauthorizedException("Account suspended");

        if (!_passwordService.VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid credentials");

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshTokenPlain = _tokenService.GenerateRefreshToken();

        var tokenHash = HashToken(refreshTokenPlain);
        var expiryDaysStr = _configuration["JWT_REFRESH_EXPIRY_DAYS"] ?? "7";
        if (!int.TryParse(expiryDaysStr, out var expiryDays)) expiryDays = 7;

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(expiryDays)
        };
        await _userRepository.AddRefreshTokenAsync(refreshTokenEntity);

        var userProfile = new UserProfileResponse
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role.ToString(),
            FullName = GetFullName(user),
            Depot = user.DispatcherProfile?.Depot ?? user.LoaderProfile?.Depot ?? user.DriverProfile?.Depot,
            OutletId = user.StoreManagerProfile?.OutletId,
            VehicleId = user.DriverProfile?.VehicleId,
            LicenseNumber = user.DriverProfile?.LicenseNumber,
            EmployeeId = GetEmployeeId(user)
        };

        var expiryMinutesStr = _configuration["JWT_EXPIRY_MINUTES"] ?? "60";
        if (!int.TryParse(expiryMinutesStr, out var expiryMinutes)) expiryMinutes = 60;

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenPlain,
            ExpiresIn = expiryMinutes * 60,
            User = userProfile
        };
    }

    public async Task<RefreshTokenResponse> RefreshAsync(RefreshTokenRequest request)
    {
        // For refresh, we'd normally validate the old access token (even if expired) to get the user ID
        // But the prompt says "ValidateAccessToken OR parse userId from request if provided".
        // In this architecture, usually the gateway strips the access token, so we can't always pass it easily in the refresh body unless we add it to the DTO.
        // Alternatively, if we just validate the refresh token hash against the DB directly.
        var tokenHash = HashToken(request.RefreshToken);
        var storedToken = await _userRepository.GetRefreshTokenAsync(tokenHash, Guid.Empty); // Bypass userId check and find by hash

        if (storedToken == null || !storedToken.IsValid)
            throw new UnauthorizedException("Invalid refresh token");

        var user = await _userRepository.GetByIdAsync(storedToken.UserId);
        if (user == null || user.Status != UserStatus.active)
            throw new UnauthorizedException("Invalid user");

        await _tokenService.RevokeRefreshTokenAsync(request.RefreshToken);

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshTokenPlain = _tokenService.GenerateRefreshToken();

        var newTokenHash = HashToken(newRefreshTokenPlain);
        var expiryDaysStr = _configuration["JWT_REFRESH_EXPIRY_DAYS"] ?? "7";
        if (!int.TryParse(expiryDaysStr, out var expiryDays)) expiryDays = 7;

        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(expiryDays)
        };
        await _userRepository.AddRefreshTokenAsync(newRefreshTokenEntity);

        var expiryMinutesStr = _configuration["JWT_EXPIRY_MINUTES"] ?? "60";
        if (!int.TryParse(expiryMinutesStr, out var expiryMinutes)) expiryMinutes = 60;

        return new RefreshTokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshTokenPlain,
            ExpiresIn = expiryMinutes * 60
        };
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant());
        if (user == null)
            return; // Success anyway (no user enumeration)

        var resetToken = _passwordService.GenerateResetToken();
        var hashedToken = _passwordService.HashResetToken(resetToken);

        var resetTokenEntity = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = hashedToken,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        await _userRepository.AddPasswordResetTokenAsync(resetTokenEntity);

        // TODO: Send email via notification service
        Console.WriteLine($"[Dev] Password reset link for {user.Email}: ?token={resetToken}");
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var hashedToken = _passwordService.HashResetToken(request.Token);
        var tokenEntity = await _userRepository.GetPasswordResetTokenAsync(hashedToken);

        if (tokenEntity == null || !tokenEntity.IsValid)
            throw new UnauthorizedException("Invalid or expired reset token");

        var user = await _userRepository.GetByIdAsync(tokenEntity.UserId);
        if (user == null)
            throw new UnauthorizedException("Invalid user");

        user.PasswordHash = _passwordService.HashPassword(request.NewPassword);
        await _userRepository.UpdateAsync(user);

        tokenEntity.IsUsed = true;
        tokenEntity.UsedAt = DateTime.UtcNow;
        await _userRepository.UpdatePasswordResetTokenAsync(tokenEntity);

        await _userRepository.RevokeAllRefreshTokensForUserAsync(user.Id);
    }

    private string HashToken(string token)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        var hashBytes = SHA256.HashData(tokenBytes);
        return Convert.ToHexString(hashBytes);
    }

    private string GetFullName(User user) => user.Role switch
    {
        UserRole.DISPATCHER => user.DispatcherProfile?.FullName ?? "",
        UserRole.LOADER => user.LoaderProfile?.FullName ?? "",
        UserRole.DRIVER => user.DriverProfile?.FullName ?? "",
        UserRole.STORE_MANAGER => user.StoreManagerProfile?.FullName ?? "",
        _ => ""
    };

    private string? GetEmployeeId(User user) => user.Role switch
    {
        UserRole.DISPATCHER => user.DispatcherProfile?.EmployeeId,
        UserRole.LOADER => user.LoaderProfile?.EmployeeId,
        UserRole.DRIVER => user.DriverProfile?.EmployeeId,
        UserRole.STORE_MANAGER => user.StoreManagerProfile?.EmployeeId,
        _ => null
    };
}
