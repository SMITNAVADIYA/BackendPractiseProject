import { asyncHandler } from "../utils/asyncHndler.js"


const registerUser = asyncHandler(async (req,res) => {
  res.status(200).json({
    success: true,
    message: 'ok'
  })
});

export {registerUser}