const User = require('../models/user-model');
const { uploadOnCloudinary } = require('../services/cloudinary-service');

class ProfileController {

    async getProfile(req, res) {
        try {
            const profileUserId = req.params.id;
            const currentUserId = req.user._id;

            const user = await User.findById(profileUserId)
                .populate('followers', 'name avatar')
                .populate('following', 'name avatar');

            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                });
            }

            // check if current logged-in user follows this profile
            const isFollowing = user.followers.some((follower) => {
                const fid = follower?._id ?? follower;
                return (
                    fid &&
                    fid.toString() === currentUserId.toString()
                );
            });
            const isMe = currentUserId.toString() === profileUserId.toString();

            return res.status(200).json({
                id: user._id,
                name: user.name,
                avatar: user.avatar,
                bio: user.bio,

                followersCount: user.followers.length,
                followingCount: user.following.length,

                followers: user.followers,
                following: user.following,

                isFollowing,
                isMe
            });

        } catch (err) {
            console.log(err);

            return res.status(500).json({
                message: 'Internal server error',
            });
        }
    }
    async editProfile(req, res) {

        try {

            const userId = req.user._id;

            const { name, bio } = req.body;

            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                });
            }

            if (name) {
                user.name = name;
            }

            if (typeof bio === 'string') {
                user.bio = bio;
            }

            // avatar upload
            if (req.file?.path) {

                const avatar =
                    await uploadOnCloudinary(
                        req.file.path
                    );

                user.avatar = avatar.url;
            }

            await user.save();

            return res.status(200).json({
                message: 'Profile updated',
                user,
            });

        } catch (err) {

            console.log(err);

            return res.status(500).json({
                message: 'Internal server error',
            });
        }
    }
    async searchUsers(req, res) {

        try {

            const query = req.query.query;

            if (!query) {
                return res.json([]);
            }

            const users = await User.find({
                _id: { $ne: req.user._id },
             
                name: {
                   $regex: query,
                   $options: 'i',
                },
             })
            .select('_id name avatar bio');

            return res.status(200).json(users);

        } catch (err) {

            console.log(err);

            return res.status(500).json({
                message: 'Internal server error',
            });
        }
    }
}

module.exports = new ProfileController();