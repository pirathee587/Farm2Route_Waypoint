namespace Auth.Domain.Entities;

public class DriverProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public required string FullName { get; set; }
    public string? VehicleId { get; set; }
    public string? LicenseNumber { get; set; }
    public required string Depot { get; set; }
    public string? EmployeeId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
