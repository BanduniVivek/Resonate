const userService = require('../services/user-service');


class SocialController{
    async follow(req, res) {
        const currentUserId = req.user._id;
        const targetUserId = req.params.id;

        if(!currentUserId || !targetUserId){
            return res
                .status(400)
                .json({ message: 'follower and following is required' });
        }
     
        if(currentUserId.toString() === targetUserId.toString()) {
           return res.status(400).json({
              message: "Cannot follow yourself"
           });
        }
     
        const currentUser = await userService.findUser({
            _id: currentUserId
        });
        
        const targetUser = await userService.findUser({
            _id: targetUserId
        });
     
        if (!currentUser) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (!targetUser) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        // already following
        const alreadyFollowing =
        currentUser.following.some(
            (id) => id.toString() === targetUserId.toString()
        );

        if (alreadyFollowing) {
        return res.status(400).json({
            message: 'Already following',
        });
}
     
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);
     
        await currentUser.save();
        await targetUser.save();
     
        res.status(200).json({
           message: "Followed successfully"
        });
     }

    async unfollow(req, res) {
        try {
            const currentUserId = req.user._id;
            const targetUserId = req.params.id;

            const currentUser = await userService.findUser({
                _id: currentUserId
            });
            
            const targetUser = await userService.findUser({
                _id: targetUserId
            });

            
            if (!currentUser) {
                return res.status(404).json({
                    message: 'User not found',
                });
            }

            if (!targetUser) {
                return res.status(404).json({
                    message: 'Target user not found',
                });
            }

            // remove from following
            currentUser.following = currentUser.following.filter(
                (id) => id.toString() !== targetUserId.toString()
            );

            // remove from followers
            targetUser.followers = targetUser.followers.filter(
                (id) => id.toString() !== currentUserId.toString()
            );

            await currentUser.save();
            await targetUser.save();

            return res.status(200).json({
                message: "User unfollowed successfully",
            });

        } catch (err) {
            console.log(err);

            return res.status(500).json({
                message: "Internal server error",
            });
        }
    }
}

module.exports = new SocialController();
