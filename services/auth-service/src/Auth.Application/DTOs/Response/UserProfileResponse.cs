namespace Auth.Application.DTOs.Response;

public class UserProfileResponse
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string Role { get; set; }
    public required string FullName { get; set; }
    
    // Role-specific fields
    public string? Depot { get; set; }
    public string? OutletId { get; set; }
    public string? VehicleId { get; set; }
    public string? LicenseNumber { get; set; }
    public string? EmployeeId { get; set; }
}
