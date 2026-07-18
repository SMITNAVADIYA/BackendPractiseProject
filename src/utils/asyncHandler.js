// Higher order function util function with error handling globally 

const asyncHandler = (requestHandler) => {
    return (req, res, next) => Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error))
}

export { asyncHandler }