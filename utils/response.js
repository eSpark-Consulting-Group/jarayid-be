const response = {
    success: (res, data, message = 'Success') => {
        return res.status(200).json({
            status: 'success',
            message,
            data
        });
    },
    error: (res, message, statusCode = 400, error = null) => {
        return res.status(statusCode).json({
            status: 'error',
            message,
            error
        });
    },
    unauthorized: (res, message = 'Unauthorized') => {
        return res.status(401).json({
            status: 'error',
            message,
            error: 'Authentication required'
        });
    },
    notFound: (res, message = 'Not Found') => {
        return res.status(404).json({
            status: 'error',
            message,
            error: 'Resource not found'
        });
    }
};

export default response;
