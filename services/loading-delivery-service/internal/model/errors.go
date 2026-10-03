package model

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// AppError is the standard JSON error structure for the service
type AppError struct {
	Message string `json:"error"`
	Code    string `json:"code"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) ErrorDescription() string {
	return e.Error()
}

// Predefined error codes
const (
	ErrCodeUnauthorized        = "UNAUTHORIZED"
	ErrCodeForbidden           = "FORBIDDEN"
	ErrCodeNotFound            = "NOT_FOUND"
	ErrCodeBadRequest          = "BAD_REQUEST"
	ErrCodeConflict            = "CONFLICT"
	ErrCodeInternal            = "INTERNAL_ERROR"
	ErrCodeValidationFailed    = "VALIDATION_FAILED"
	ErrCodeGatewayUnverified   = "GATEWAY_UNVERIFIED"
	ErrCodeOutOfSequence       = "OUT_OF_SEQUENCE"
	ErrCodePlanUnacknowledged  = "PLAN_UNACKNOWLEDGED"
	ErrCodeItemHasIssue        = "ITEM_HAS_ISSUE"
	ErrCodeChecklistIncomplete = "CHECKLIST_INCOMPLETE"
	ErrCodeStopAlreadyStarted  = "STOP_ALREADY_STARTED"
	ErrCodeVersionConflict     = "VERSION_CONFLICT"
)

// ChecklistIncompleteError represents a 422 error when confirming a stop with pending items
type ChecklistIncompleteError struct {
	Message   string `json:"error"`
	Code      string `json:"code"`
	Unchecked int    `json:"unchecked"`
	Status    int    `json:"-"`
}

func (e *ChecklistIncompleteError) Error() string {
	return fmt.Sprintf("[%s] %s (%d unchecked)", e.Code, e.Message, e.Unchecked)
}

func (e *ChecklistIncompleteError) WriteJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnprocessableEntity)
	_ = json.NewEncoder(w).Encode(e)
}

// NewAppError creates a new AppError
func NewAppError(code, message string, status int) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}

// WriteJSON writes the AppError as JSON to the http.ResponseWriter
func (e *AppError) WriteJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	status := e.Status
	if status == 0 {
		status = http.StatusInternalServerError
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(e)
}

// Common error constructors
func ErrUnauthorized(msg string) *AppError {
	if msg == "" {
		msg = "Authentication credentials missing or invalid"
	}
	return NewAppError(ErrCodeUnauthorized, msg, http.StatusUnauthorized)
}

func ErrForbidden(msg string) *AppError {
	if msg == "" {
		msg = "Insufficient permissions to perform this action"
	}
	return NewAppError(ErrCodeForbidden, msg, http.StatusForbidden)
}

func ErrNotFound(msg string) *AppError {
	if msg == "" {
		msg = "Resource not found"
	}
	return NewAppError(ErrCodeNotFound, msg, http.StatusNotFound)
}

func ErrBadRequest(msg string) *AppError {
	if msg == "" {
		msg = "Invalid request payload or parameters"
	}
	return NewAppError(ErrCodeBadRequest, msg, http.StatusBadRequest)
}

func ErrInternal(msg string) *AppError {
	if msg == "" {
		msg = "An unexpected internal error occurred"
	}
	return NewAppError(ErrCodeInternal, msg, http.StatusInternalServerError)
}
