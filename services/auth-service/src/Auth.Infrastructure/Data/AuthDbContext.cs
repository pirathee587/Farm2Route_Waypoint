using Auth.Domain.Entities;
using Auth.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Auth.Infrastructure.Data;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<DispatcherProfile> DispatcherProfiles { get; set; }
    public DbSet<LoaderProfile> LoaderProfiles { get; set; }
    public DbSet<DriverProfile> DriverProfiles { get; set; }
    public DbSet<StoreManagerProfile> StoreManagerProfiles { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("auth_schema");

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Role).IsRequired().HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.DispatcherProfile).WithOne(p => p.User).HasForeignKey<DispatcherProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.LoaderProfile).WithOne(p => p.User).HasForeignKey<LoaderProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.DriverProfile).WithOne(p => p.User).HasForeignKey<DriverProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.StoreManagerProfile).WithOne(p => p.User).HasForeignKey<StoreManagerProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            
            entity.HasMany(e => e.RefreshTokens).WithOne(rt => rt.User).HasForeignKey(rt => rt.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.PasswordResetTokens).WithOne(prt => prt.User).HasForeignKey(prt => prt.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DispatcherProfile>(entity =>
        {
            entity.ToTable("dispatcher_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Depot).IsRequired().HasMaxLength(50);
            entity.Property(e => e.EmployeeId).HasMaxLength(50);
            entity.HasIndex(e => e.EmployeeId).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<LoaderProfile>(entity =>
        {
            entity.ToTable("loader_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Depot).IsRequired().HasMaxLength(50);
            entity.Property(e => e.EmployeeId).HasMaxLength(50);
            entity.HasIndex(e => e.EmployeeId).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<DriverProfile>(entity =>
        {
            entity.ToTable("driver_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.VehicleId).HasMaxLength(50);
            entity.Property(e => e.LicenseNumber).HasMaxLength(100);
            entity.HasIndex(e => e.LicenseNumber).IsUnique();
            entity.Property(e => e.Depot).IsRequired().HasMaxLength(50);
            entity.Property(e => e.EmployeeId).HasMaxLength(50);
            entity.HasIndex(e => e.EmployeeId).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<StoreManagerProfile>(entity =>
        {
            entity.ToTable("store_manager_profiles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.OutletId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.EmployeeId).HasMaxLength(50);
            entity.HasIndex(e => e.EmployeeId).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });
    }
}
