import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user/user.model.js";
import { getPublicId, uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jsonWebToken from "jsonwebtoken";
import mongoose from "mongoose";

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



const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || currentPassword.trim() === "") {
    throw new ApiError(400, "Current password is required");
  }

  if (!newPassword || newPassword.trim() === "") {
    throw new ApiError(400, "New password is required");
  }

  if (!passwordRegex.test(newPassword)) {
    throw new ApiError(
      400,
      "New password must contain at least 8 characters with letters and numbers"
    );
  }

  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      "New password cannot be the same as current password"
    );
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});



// get current user function
const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})



// Update user profile function
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  if (!(fullName || email || userName || password)) {
    throw new ApiError(400, 'All fields are required for update')
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: { fullName, email, userName, password }
    },
    { new: true }
  ).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, user, 'User profile updated successfully'))
})


// Upate user avatar function
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required');
  }

  const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatar.url } }, { new: true }).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  if (user.avatar) {
    const publicId = getPublicId(user.avatar);
    await deleteFromCloudinary(publicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, 'Failed to upload avatar on cloudinary, please try again')
  }

  return res.status(200).json(new ApiResponse(200, user, 'Avatar updated successfully'))
})


// Upate user cover image function
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, 'Cover image is required');

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { coverImage: coverImage.url } }, { new: true }).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    if (user.coverImage) {
      const publicId = getPublicId(user.coverImage);
      await deleteFromCloudinary(publicId);
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
      throw new ApiError(400, 'Failed to upload cover image on cloudinary, please try again')
    }

    return res.status(200).json(new ApiResponse(200, user, 'Cover image updated successfully'))
  }
})

const getUserChannels = asyncHandler(async (req, res) => {
  const { userName } = req.params;

  if (!userName || userName.trim() === '') {
    throw new ApiError(400, 'User name is missing')
  }

  const channels = await User.aggregate(
    [
      {
        $match: {
          userName: userName?.toLowerCase()
        }
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'channel',
          as: 'subscribers'
        }
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'subscriber',
          as: 'subscribedTo'
        }
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers"
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo"
          },
          isSubscribed: {
            $cond: {
              if: {$in: [req.user?._id,'$subscribers.subscriber']},
              then: true,
              else: false             
            }
          }

        }
      },
      {
        $project: {
          fullName: 1,
          userName: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1
        }
      }
    ]
  )

  if(!channels?.length){
    throw new ApiError(404, 'Channel does not exists')
  }

  return res.status(200).json(new ApiResponse(200, channels[0],'Channel fetched succesfully'))
})

const getUserVideoWatchHistory = asyncHandler(async (req,res) => {
  const user = await User.aggregate([
    {
      $match: {
       _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: '$owner'
              }
            }
          }
        ]
      }
    }
  ]);

  return res.status(200).json(new ApiResponse(200,user[0].watchHistory,'Video history fetched successfully!!!'))
})

export { registerUser, loginUser, logOutUser, refreshNewToken, changeCurrentPassword, getCurrentUser, updateProfile, updateUserAvatar, updateUserCoverImage, getUserChannels ,getUserVideoWatchHistory} 