import { Router } from 'express';
import { loginUser, registerUser, logOutUser, refreshNewToken, changeCurrentPassword, getCurrentUser , updateProfile , updateUserAvatar , updateUserCoverImage, getUserChannels, getUserVideoWatchHistory} from '../controllers/user.controller.js';
import { upload } from '../middlewars/multer.middleware.js';
import { verifyJWT } from '../middlewars/auth.middlewere.js';



export const router = Router();

router.route('/register').post(
  upload.fields(
    [
      {
        name: 'avatar',
        maxCount: 1
      },
      {
        name: 'coverImage',
        maxCount: 1
      }
    ]
  ),
  registerUser);
router.route('/login').post(loginUser);

// secure routes
router.route('/logout').post(verifyJWT, logOutUser);
router.route('/refresh-token').post(refreshNewToken);
router.route('/change-password').put(verifyJWT, changeCurrentPassword);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/update-profile').patch(verifyJWT, updateProfile);
router.route('/update-avatar').patch(verifyJWT, upload.single('avatar'), updateUserAvatar);
router.route('/update-cover-image').patch(verifyJWT, upload.single('coverImage'), updateUserCoverImage);
router.route('/get-user-chanels/:userName').get(verifyJWT,getUserChannels);
router.route('/watchHistory').get(verifyJWT,getUserVideoWatchHistory);













