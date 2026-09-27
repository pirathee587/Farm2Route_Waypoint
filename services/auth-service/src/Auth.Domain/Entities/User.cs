using Auth.Domain.Enums;

namespace Auth.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required UserRole Role { get; set; }
    public UserStatus Status { get; set; } = UserStatus.active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public DispatcherProfile? DispatcherProfile { get; set; }
    public LoaderProfile? LoaderProfile { get; set; }
    public DriverProfile? DriverProfile { get; set; }
    public StoreManagerProfile? StoreManagerProfile { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
}
