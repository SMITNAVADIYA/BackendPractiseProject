import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiRespone } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, password } = req.body;
  console.log('Fullname---', fullName);
  console.log('User name---', userName);
  console.log('Email---', email);
  console.log('Password---', password);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    [fullName, userName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Please enter valid email')
  }

  const existedUser = User.find({
    $or: [{ userName }, { email }]
  });

  if (existedUser) {
    throw new ApiError(409, 'User is already exist')
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;


  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required')
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400,'Avatar file is required')
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
    userName,
    email,
    password,
  })
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if(!createdUser){
    throw new ApiError(500,'Internal server error')
  }

  return ApiRespone(200, createdUser , 'User registered successfully!!!')
})

export { registerUser }