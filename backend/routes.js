const router = require('express').Router();
const authController = require('./controllers/auth-controller');
const activateController = require('./controllers/activate-controller');
const authMiddleware = require('./middlewares/auth-middleware');
const { upload } = require('./middlewares/multer-middleware');
const roomsController = require('./controllers/rooms-controller.js');
const socialController = require('./controllers/social-controller');
const profileController = require('./controllers/profile-controller');
const roomAccessMiddleware = require('./middlewares/room-access-middleware');


router.post('/api/send-otp', authController.sendOtp);
router.post('/api/verify-otp', authController.verifyOtp);
router.post('/api/activate', authMiddleware, upload.single('avatar'), activateController.activate);
router.get('/api/refresh', authController.refresh);
router.post('/api/logout', authMiddleware, authController.logout);
router.post('/api/rooms', authMiddleware, roomsController.create);
router.get('/api/rooms', authMiddleware, roomsController.index);
router.get('/api/rooms/search', authMiddleware, roomsController.search);
router.get('/api/rooms/closed', authMiddleware, roomsController.closed);
router.post('/api/rooms/join-by-code', authMiddleware, roomsController.joinByCode);
router.get('/api/rooms/:roomId/invite-code',authMiddleware,roomsController.inviteCode);
router.get('/api/rooms/:roomId',authMiddleware,roomAccessMiddleware,roomsController.show);
router.post('/api/follow/:id',authMiddleware,socialController.follow);
router.post('/api/unfollow/:id',authMiddleware,socialController.unfollow);
router.get('/api/profile/:id',authMiddleware,profileController.getProfile);
router.get('/api/search',authMiddleware,profileController.searchUsers);
router.put('/api/profile',authMiddleware,upload.single('avatar'),profileController.editProfile);

module.exports = router;
