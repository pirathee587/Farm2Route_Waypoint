using Auth.Application.DTOs.Response;
using Auth.Application.Interfaces;
using Auth.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UserController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public UserController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    private bool IsAuthorizedDispatcher()
    {
        // 1. Check Gateway injected identity headers
        var roleHeader = Request.Headers["X-User-Role"].FirstOrDefault();
        if (!string.IsNullOrEmpty(roleHeader))
        {
            return string.Equals(roleHeader, "DISPATCHER", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(roleHeader, "ADMIN", StringComparison.OrdinalIgnoreCase);
        }

        // 2. Direct call with JWT Authorization header
        if (User.Identity?.IsAuthenticated == true)
        {
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            return string.Equals(roleClaim, "DISPATCHER", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserProfileResponse>>> GetUsersByRole([FromQuery] string? role)
    {
        if (!IsAuthorizedDispatcher())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only dispatchers can access this resource." });

        if (string.IsNullOrWhiteSpace(role) || !Enum.TryParse<UserRole>(role.ToUpperInvariant(), out var userRole))
            return BadRequest(new { message = "A valid 'role' query param is required (e.g. DRIVER)." });

        var users = await _userRepository.GetAllByRoleAsync(userRole);

        var response = users.Select(user => new UserProfileResponse
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role.ToString(),
            FullName = user.DispatcherProfile?.FullName ?? user.LoaderProfile?.FullName
                       ?? user.DriverProfile?.FullName ?? user.StoreManagerProfile?.FullName ?? "",
            Depot = user.DispatcherProfile?.Depot ?? user.LoaderProfile?.Depot ?? user.DriverProfile?.Depot,
            OutletId = user.StoreManagerProfile?.OutletId,
            VehicleId = user.DriverProfile?.VehicleId,
            LicenseNumber = user.DriverProfile?.LicenseNumber,
            EmployeeId = user.DispatcherProfile?.EmployeeId ?? user.LoaderProfile?.EmployeeId
                         ?? user.DriverProfile?.EmployeeId ?? user.StoreManagerProfile?.EmployeeId
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserProfileResponse>> GetUser(Guid id)
    {
        if (!IsAuthorizedDispatcher())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only dispatchers can access this resource." });

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return NotFound();

        var response = new UserProfileResponse
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role.ToString(),
            FullName = user.DispatcherProfile?.FullName ?? user.LoaderProfile?.FullName ?? user.DriverProfile?.FullName ?? user.StoreManagerProfile?.FullName ?? "",
            Depot = user.DispatcherProfile?.Depot ?? user.LoaderProfile?.Depot ?? user.DriverProfile?.Depot,
            OutletId = user.StoreManagerProfile?.OutletId,
            VehicleId = user.DriverProfile?.VehicleId,
            LicenseNumber = user.DriverProfile?.LicenseNumber,
            EmployeeId = user.DispatcherProfile?.EmployeeId ?? user.LoaderProfile?.EmployeeId ?? user.DriverProfile?.EmployeeId ?? user.StoreManagerProfile?.EmployeeId
        };

        return Ok(response);
    }
}
