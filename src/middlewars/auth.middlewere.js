import { asyncHandler } from '../utils/asyncHandler.js';
import jsonwebtoken from 'jsonwebtoken';
import { User } from '../models/user/user.model.js';
import { ApiError } from '../utils/apiError.js';

// Check if the user is authenticated by verifying the JWT token
const verifyJWT = asyncHandler(async (req, res, next) => {
    console.log("verifyJWT called");
    try {
        const token = req.cookies.accessToken || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new ApiError(401, 'Access Denied. No token provided');
        }

        const decodedToken = jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select('-password -refreshToken');

        if (!user) {
            throw new ApiError(401, 'Access Denied. User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error.message || 'Access Denied. Invalid token');
    }
})

export { verifyJWT };