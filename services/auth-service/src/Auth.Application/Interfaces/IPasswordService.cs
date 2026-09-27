namespace Auth.Application.Interfaces;

public interface IPasswordService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    string GenerateResetToken();
    string HashResetToken(string token);
}
