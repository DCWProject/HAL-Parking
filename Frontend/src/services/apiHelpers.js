// API Response Helper
// Extracts data from the standardized response envelope
export const unwrapResponse = (response) => {
    return response.data.data;
};

// Error Handler Helper
// Extracts error messages from the standardized error response
export const extractErrorMessage = (error) => {
    if (error.response?.data?.message) {
        return error.response.data.message;
    }
    if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        // If it's field-specific errors, combine them
        if (typeof errors === 'object' && !Array.isArray(errors)) {
            return Object.entries(errors)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('; ');
        }
    }
    return error.message || 'An error occurred';
};
