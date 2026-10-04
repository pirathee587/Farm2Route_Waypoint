using Auth.Domain.Entities;
using Auth.Domain.Enums;
using BCrypt.Net;

namespace Auth.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AuthDbContext context)
    {
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

        var drv014 = new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222214"),
            Email = "drv014@waypoint.lk",
            PasswordHash = defaultPassword,
            Role = UserRole.DRIVER,
            DriverProfile = new DriverProfile
            {
                FullName = "Driver DRV014",
                Depot = "Peliyagoda",
                VehicleId = "VEH014",
                LicenseNumber = "LK001214",
                EmployeeId = "DRV014"
            }
        };

        if (!context.Users.Any())
        {
            context.Users.AddRange(dispatcher, loader, driver, storeManager, drv014);
            await context.SaveChangesAsync();
        }
        else if (!context.Users.Any(u => u.Email == "drv014@waypoint.lk"))
        {
            context.Users.Add(drv014);
            await context.SaveChangesAsync();
        }
    }
}
