using System.Net;
using System.Text.Json;
using Auth.Application.Exceptions;

namespace Auth.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var statusCode = (int)HttpStatusCode.InternalServerError;
        var errorCode = "INTERNAL_ERROR";
        var message = "An internal server error occurred.";
        var environment = context.RequestServices.GetRequiredService<IHostEnvironment>();

        switch (exception)
        {
            case UnauthorizedException e:
                statusCode = (int)HttpStatusCode.Unauthorized;
                errorCode = "UNAUTHORIZED";
                message = e.Message;
                break;
            case NotFoundException e:
                statusCode = (int)HttpStatusCode.NotFound;
                errorCode = "NOT_FOUND";
                message = e.Message;
                break;
            case ValidationException e:
                statusCode = (int)HttpStatusCode.BadRequest;
                errorCode = "VALIDATION_ERROR";
                message = e.Message;
                break;
        }

        context.Response.StatusCode = statusCode;

        var result = JsonSerializer.Serialize(new
        {
            error = errorCode,
            message = message,
            statusCode = statusCode,
            detail = environment.IsDevelopment() ? exception.ToString() : null
        });

        return context.Response.WriteAsync(result);
    }
}
