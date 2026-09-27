using Auth.Application.DTOs.Response;
using Auth.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
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

    [HttpGet("{id}")]
    [Authorize(Roles = "DISPATCHER")]
    public async Task<ActionResult<UserProfileResponse>> GetUser(Guid id)
    {
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
