const userService = require('../services/user-service');
const UserDto = require('../dtos/user-dto');
const { uploadOnCloudinary } = require("../services/cloudinary-service")

class ActivateController {
    async activate(req, res) {
        // Activation logic
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'name is required!' });
        }

        const avatarLocalPath = req.file?.path;
        if (!avatarLocalPath) {
            return res.status(400).json({
                message: "Avatar is required",
            });
        }


         //uploading to cloudinary
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            return res.status(400).json({
                message: "Failed to upload avatar",
            });
        }
        const userId = req.user._id;
        // Update user
        try {
            const user = await userService.findUser({ _id: userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found!' });
            }
            user.activated = true;
            user.name = name;
            user.avatar = avatar.url;
            await user.save();
            console.log( new UserDto(user) );
            return res.json({ user: new UserDto(user), auth: true });

        } catch (err) {
            console.log(err.message)
            return res.status(500).json({ message: err.message });
        }
    }
}

module.exports = new ActivateController();
