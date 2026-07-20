import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jsonWebToken from "jsonwebtoken";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

const options = {
  httpOnly: true,
  secure: true,
}

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log('Error generating access and refresh token:', error);
    throw new ApiError(500, 'Internal server error');
  }
}



//  Register user function
const registerUser = asyncHandler(async (req, res) => {


  // Get details from frontend
  const { fullName, userName, email, password } = req.body;



  // Check any field is empty OR skip by client and throw error
  if (
    [fullName, userName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }



  if (!passwordRegex.test(password)) {
    throw new ApiError(400, 'Password must be at least 8 characters long and contain both letters and numbers')
  }


  // Regex for check email format & throw error msg for inValid email

  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Please enter valid email')
  }



  //  Check for user already exist and throw error if it is
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }]
  });
  if (existedUser) {
    throw new ApiError(409, 'User is already exist')
  }

  // Get local path for avatar and cover image from client & throw error as avatar is required
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path || '';

  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required')
  }



  // Upload avatar & cover image to cloudinary and throw error for avatar required
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, 'Failed to upload avatar on cloudinary, please try again')
  }



  // Doing entry to database
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
    userName,
    email,
    password,
  })


  // Removed password and refresh token from response as it's not good practise & throw error
  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new ApiError(500, 'Internal server error')
  }

  return res.status(201).json(new ApiResponse(200, createdUser, 'Usr registered successfully!!!'))
})









// login user function
const loginUser = asyncHandler(async (req, res) => {
  // Get detail from frontend
  // Validation
  // Check if user is found Or not
  // Check if password is correct or not
  // Generate access token and refresh token
  // send cookie with refresh token and send access token in response
  const { email, password, userName } = req.body;
  console.log('Request body----', req.body);

  if (!email || email.trim() === '') {
    throw new ApiError(400, 'Email is required')
  }

  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Please enter valid email')
  }

  if (!password || password.trim() === '') {
    throw new ApiError(400, 'Password is required')
  }

  if (!passwordRegex.test(password)) {
    throw new ApiError(400, 'Please enter valid password')
  }

  const userExist = await User.findOne({
    $or: [{ userName }, { email }]
  });

  if (!userExist) {
    throw new ApiError(404, 'User not found')
  }

  const isPasswordValid = await userExist.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid password')
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(userExist._id)

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(new ApiResponse(200, { user: userExist, accessToken, refreshToken }, 'User logged in successfully'))
})




// logout user function
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: null }
  }, { new: true })

  return res.status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options).json(new ApiResponse(200, null, 'User logged out successfully'))
})




// refresh access token function
const refreshNewToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.header('Authorization')?.replace('Bearer ', '');
  if (!refreshToken) {
    throw new ApiError(401, 'Access Denied. No refresh token provided');
  }

  try {
    const decodedToken = jsonWebToken.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, 'InValid refresh token');
    }

    if (refreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired or used!!!');
    }



    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user?._id);

    return res.status(200).
      cookie('accessToken', accessToken, options).
      cookie('refreshToken', newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, newRefreshToken }, 'Access token refreshed successfully'))
  } catch (error) {
    console.log('Error refreshing access token:', error);
    throw new ApiError(401, error.message || 'Access Denied. Invalid refresh token');
  }

})

export { registerUser, loginUser, logOutUser, refreshNewToken }