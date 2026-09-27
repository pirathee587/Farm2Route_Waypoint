namespace Auth.Application.DTOs.Response;

public class LoginResponse
{
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
    public required UserProfileResponse User { get; set; }
}
