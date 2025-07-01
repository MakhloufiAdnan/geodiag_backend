export class UserDto {
    constructor(user) {
        this.userId = user.user_id;
        this.email = user.email;
        this.firstName = user.first_name;
        this.lastName = user.last_name;
        this.role = user.role;
        this.isActive = user.is_active;
    }
}