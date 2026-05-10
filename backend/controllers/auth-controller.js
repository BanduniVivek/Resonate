const otpService = require("../services/otp-service");
const hashService = require('../services/hash-service');
const userService = require('../services/user-service');
const tokenService = require('../services/token-service');
const UserDto = require('../dtos/user-dto');

class AuthController {
    async sendOtp(req, res) {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone field is required!' });
        }
        //generate otp
        const otp = await otpService.generateOtp();

        const ttl = 1000 * 60 * 2; // 2 min
        const expires = Date.now() + ttl;
        const data = `${phone}.${otp}.${expires}`;
        const hash = hashService.hashOtp(data); //hash OTP

        try {
            // await otpService.sendBySms(phone, otp);
            return res.json({
                hash: `${hash}.${expires}`,
                phone,
                otp,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'message sending failed' });
        }
    }


    async verifyOtp(req, res) {
        const { otp, hash, phone } = req.body;
        if (!otp || !hash || !phone) {
            return res.status(400).json({ message: 'All fields are required!' });
        }

        const [hashedOtp, expires] = hash.split('.');
        if (Date.now() > +expires) {
            return res.status(400).json({ message: 'OTP expired!' });
        }

        const data = `${phone}.${otp}.${expires}`;
        const isValid = otpService.verifyOtp(hashedOtp, data);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        let user;
        try {
            user = await userService.findUser({ phone });
            if (!user) {
                user = await userService.createUser({ phone });
                console.log("User created successfully")
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Db error' });
        }

        const { accessToken, refreshToken } = tokenService.generateTokens({
            _id: user._id,
            activated: false,
        });
        
        await tokenService.storeRefreshToken(refreshToken, user._id);

        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true,
        });

        res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true,
        });

        const userDto = new UserDto(user);
        return res.json({ auth: true, user: userDto });
    }

    
}
module.exports = new AuthController();