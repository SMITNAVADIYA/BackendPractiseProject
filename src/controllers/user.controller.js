import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

  if (!passwordRegex.test(password)) {
    throw new ApiError(400, 'Password must be at least 8 characters long and contain both letters and numbers')
  }


  // Regex for check email format & throw error msg for inValid email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
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

export { registerUser }