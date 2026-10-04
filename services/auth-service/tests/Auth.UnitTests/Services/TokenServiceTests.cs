using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Auth.Application.Interfaces;
using Auth.Application.Services;
using Auth.Domain.Entities;
using Auth.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Moq;

namespace Auth.UnitTests.Services;

public class TokenServiceTests
{
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly TokenService _tokenService;

    public TokenServiceTests()
    {
        _configurationMock = new Mock<IConfiguration>();
        _userRepositoryMock = new Mock<IUserRepository>();

        _configurationMock.Setup(c => c["JWT_SECRET"]).Returns("this_is_a_test_secret_that_needs_to_be_long_enough");
        _configurationMock.Setup(c => c["JWT_ISSUER"]).Returns("test-issuer");
        _configurationMock.Setup(c => c["JWT_AUDIENCE"]).Returns("test-audience");
        _configurationMock.Setup(c => c["JWT_EXPIRY_MINUTES"]).Returns("60");

        _tokenService = new TokenService(_configurationMock.Object, _userRepositoryMock.Object);
    }

    [Fact]
    public void GenerateAccessToken_ReturnsValidJwt()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), Email = "test@waypoint.lk", PasswordHash = "hashed", Role = UserRole.DISPATCHER };

        // Act
        var token = _tokenService.GenerateAccessToken(user);

        // Assert
        Assert.NotNull(token);
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        Assert.Equal("test-issuer", jwtToken.Issuer);
        Assert.Contains(jwtToken.Claims, c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "test@waypoint.lk");
        Assert.Contains(jwtToken.Claims, c => c.Type == "role" && c.Value == "DISPATCHER");
        Assert.DoesNotContain(jwtToken.Claims, c => c.Type == "outlet_id");
    }

    [Fact]
    public void GenerateAccessToken_StoreManagerIncludesOutletClaim()
    {
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "manager@waypoint.lk", PasswordHash = "hashed",
            Role = UserRole.STORE_MANAGER,
            StoreManagerProfile = new StoreManagerProfile
            {
                FullName = "Manager", OutletId = "OUT001", EmployeeId = "SM001"
            }
        };

        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(_tokenService.GenerateAccessToken(user));

        Assert.Contains(jwtToken.Claims, c => c.Type == "outlet_id" && c.Value == "OUT001");
    }

    [Fact]
    public void ValidateAccessToken_WithValidToken_ReturnsClaims()
    {
        // Arrange
        var user = new User { Id = Guid.NewGuid(), Email = "test@waypoint.lk", PasswordHash = "hashed", Role = UserRole.DISPATCHER };
        var token = _tokenService.GenerateAccessToken(user);

        // Act
        var principal = _tokenService.ValidateAccessToken(token);

        // Assert
        Assert.NotNull(principal);
        Assert.True(principal.HasClaim(c => c.Type == ClaimTypes.Email && c.Value == "test@waypoint.lk"));
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsBase64UrlString()
    {
        // Act
        var token = _tokenService.GenerateRefreshToken();

        // Assert
        Assert.NotNull(token);
        Assert.DoesNotContain("+", token);
        Assert.DoesNotContain("/", token);
        Assert.DoesNotContain("=", token);
    }
}
