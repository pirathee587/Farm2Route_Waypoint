using Auth.Application.DTOs.Request;
using Auth.Application.Exceptions;
using Auth.Application.Interfaces;
using Auth.Application.Services;
using Auth.Domain.Entities;
using Auth.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Moq;

namespace Auth.UnitTests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<ITokenService> _tokenServiceMock;
    private readonly Mock<IPasswordService> _passwordServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _tokenServiceMock = new Mock<ITokenService>();
        _passwordServiceMock = new Mock<IPasswordService>();
        _configurationMock = new Mock<IConfiguration>();

        _authService = new AuthService(
            _userRepositoryMock.Object,
            _tokenServiceMock.Object,
            _passwordServiceMock.Object,
            _configurationMock.Object);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsLoginResponse()
    {
        // Arrange
        var request = new LoginRequest { Email = "test@waypoint.lk", Password = "placeholder-password" };
        var user = new User { Id = Guid.NewGuid(), Email = "test@waypoint.lk", PasswordHash = "hashed", Role = UserRole.DISPATCHER, Status = UserStatus.active };
        
        _userRepositoryMock.Setup(repo => repo.GetByEmailAsync("test@waypoint.lk")).ReturnsAsync(user);
        _passwordServiceMock.Setup(s => s.VerifyPassword("placeholder-password", "hashed")).Returns(true);
        _tokenServiceMock.Setup(s => s.GenerateAccessToken(user)).Returns("access-token");
        _tokenServiceMock.Setup(s => s.GenerateRefreshToken()).Returns("refresh-token");

        // Act
        var response = await _authService.LoginAsync(request);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("access-token", response.AccessToken);
        Assert.Equal("refresh-token", response.RefreshToken);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedException()
    {
        // Arrange
        var request = new LoginRequest { Email = "test@waypoint.lk", Password = "placeholder-wrong-password" };
        var user = new User { Id = Guid.NewGuid(), Email = "test@waypoint.lk", PasswordHash = "hashed", Role = UserRole.DISPATCHER, Status = UserStatus.active };
        
        _userRepositoryMock.Setup(repo => repo.GetByEmailAsync("test@waypoint.lk")).ReturnsAsync(user);
        _passwordServiceMock.Setup(s => s.VerifyPassword("placeholder-wrong-password", "hashed")).Returns(false);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _authService.LoginAsync(request));
        Assert.Equal("Invalid credentials", ex.Message); // Verifying the same message as non-existent email
    }

    [Fact]
    public async Task LoginAsync_NonExistentEmail_ThrowsUnauthorizedException()
    {
        // Arrange
        var request = new LoginRequest { Email = "nonexistent@waypoint.lk", Password = "placeholder-password" };
        
        _userRepositoryMock.Setup(repo => repo.GetByEmailAsync("nonexistent@waypoint.lk")).ReturnsAsync((User?)null);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _authService.LoginAsync(request));
        Assert.Equal("Invalid credentials", ex.Message);
    }

    [Fact]
    public async Task LoginAsync_SuspendedAccount_ThrowsUnauthorizedException()
    {
        // Arrange
        var request = new LoginRequest { Email = "suspended@waypoint.lk", Password = "placeholder-password" };
        var user = new User { Id = Guid.NewGuid(), Email = "suspended@waypoint.lk", PasswordHash = "hashed", Role = UserRole.DISPATCHER, Status = UserStatus.suspended };
        
        _userRepositoryMock.Setup(repo => repo.GetByEmailAsync("suspended@waypoint.lk")).ReturnsAsync(user);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => _authService.LoginAsync(request));
        Assert.Equal("Account suspended", ex.Message);
    }
}
