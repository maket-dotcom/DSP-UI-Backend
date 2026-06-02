const { TYPE } = require('../user/constant')

module.exports = {
    STATUS: {
        ACTIVE: 'active',
        PAUSED: 'paused',
        DELETED: 'deleted'
    },
    TYPE: TYPE,
    MEDIA_TYPE: {
        PRODUCT_IMAGE: 'product-image',
        PROFILE_IMAGE: 'profile-image'
    },
    // Logical upload categories; used as the folder segment inside the GCS bucket
    UPLOAD_TYPES: ['profile', 'product', 'template', 'campaign', 'note'],
    DEFAULT_UPLOAD_TYPE: 'product'
}