const TYPES = {
    PROFILE: 'profile',
    CHECK: 'check'
}


const getName = ({ user, type }) => {
    return `${user.email}-${user.user_id}/${type}`;
}

module.exports = {
    getName,
    TYPES
};