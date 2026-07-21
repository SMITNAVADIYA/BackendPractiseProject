import { Router } from 'express';
import { loginUser, registerUser, logOutUser, refreshNewToken, changeCurrentPassword, getCurrentUser , updateProfile , updateUserAvatar , updateUserCoverImage} from '../controllers/user.controller.js';
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
router.route('/update-profile').put(verifyJWT, updateProfile);
router.route('/update-avatar').put(verifyJWT, upload.single('avatar'), updateUserAvatar);
router.route('/update-cover-image').put(verifyJWT, upload.single('coverImage'), updateUserCoverImage);













