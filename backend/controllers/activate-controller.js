const { Jimp } = require('jimp');
const path = require('path');
const userService = require('../services/user-service');
const UserDto = require('../dtos/user-dto');

class ActivateController {
    async activate(req, res) {
        // Activation logic
        const { name, avatar } = req.body;
        if (!name || !avatar) {
            return res.status(400).json({ message: 'name and avatar are required!' });
        }

        // Image Base64
        const buffer = Buffer.from(
            avatar.replace(/^data:image\/png;base64,/, ''),
            'base64'
        );

        const imagePath = `${Date.now()}-${Math.round(
            Math.random() * 1e9
        )}.png`;
        // 32478362874-3242342342343432.png

        try {
            const jimResp = await Jimp.read(buffer);
            jimResp
            .resize({

                w: 150,
             
                h: 150
             
             }).write(path.resolve(__dirname, `../storage/${imagePath}`));
        } catch (err) {
            console.log("in active controller" + err.message);
            return res.status(500).json({ message: 'Could not process the image' });
        }

        const userId = req.user._id;
        // Update user
        try {
            const user = await userService.findUser({ _id: userId });
            if (!user) {
                res.status(404).json({ message: 'User not found!' });
            }
            user.activated = true;
            user.name = name;
            user.avatar = `/storage/${imagePath}`;
            user.save();
            return res.json({ user: new UserDto(user), auth: true });
        } catch (err) {
            console.log(err.message)
            return res.status(500).json({ message: err.message });
        }
    }
}

module.exports = new ActivateController();
