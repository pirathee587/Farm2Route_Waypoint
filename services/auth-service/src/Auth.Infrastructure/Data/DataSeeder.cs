using Auth.Domain.Entities;
using Auth.Domain.Enums;
using BCrypt.Net;

namespace Auth.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AuthDbContext context)
    {
        if (context.Users.Any())
            return; // Already seeded

        var defaultPassword = BCrypt.Net.BCrypt.HashPassword("Waypoint@2026", 12);

        var dispatcher = new User
        {
            Email = "dispatcher@waypoint.lk",
            PasswordHash = defaultPassword,
            Role = UserRole.DISPATCHER,
            DispatcherProfile = new DispatcherProfile
            {
                FullName = "Kasun Perera",
                Depot = "Peliyagoda",
                EmployeeId = "D001"
            }
        };

        var loader = new User
        {
            Email = "loader@waypoint.lk",
            PasswordHash = defaultPassword,
            Role = UserRole.LOADER,
            LoaderProfile = new LoaderProfile
            {
                FullName = "Gajan Raj",
                Depot = "Peliyagoda",
                EmployeeId = "L001"
            }
        };

        var driver = new User
        {
            Email = "driver@waypoint.lk",
            PasswordHash = defaultPassword,
            Role = UserRole.DRIVER,
            DriverProfile = new DriverProfile
            {
                FullName = "Nirshanth Kumar",
                Depot = "Kandy",
                VehicleId = "VEH014",
                LicenseNumber = "LK001234",
                EmployeeId = "DRV001"
            }
        };

        var storeManager = new User
        {
            Email = "manager@waypoint.lk",
            PasswordHash = defaultPassword,
            Role = UserRole.STORE_MANAGER,
            StoreManagerProfile = new StoreManagerProfile
            {
                FullName = "Kavishanth Silva",
                OutletId = "OUT001",
                EmployeeId = "SM001"
            }
        };

        context.Users.AddRange(dispatcher, loader, driver, storeManager);
        await context.SaveChangesAsync();
    }
}
