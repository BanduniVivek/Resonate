class UserDto {
    id;
    phone;
    name;
    avatar;
    bio;
    activated;
    createdAt;

    constructor(user) {
        this.id = user._id;
        this.phone = user.phone;
        this.name = user.name;
        this.avatar = user.avatar;
        this.bio = user.bio ?? '';
        this.activated = user.activated;
        this.createdAt = user.createdAt;
    }
}

module.exports = UserDto;
