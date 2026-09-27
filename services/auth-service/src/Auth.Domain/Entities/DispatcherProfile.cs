namespace Auth.Domain.Entities;

public class DispatcherProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public required string FullName { get; set; }
    public required string Depot { get; set; }
    public string? EmployeeId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
