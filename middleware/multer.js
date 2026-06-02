const multer = require('multer');
const storage = multer.memoryStorage();
const _ = require('lodash');
const upload = multer({ storage: storage });
const imageUpload = (arr) => {
    const data = [];
    console.log(arr);
    
    _.forEach(arr, (value) => {
        data.push({ name: value, maxCount: 1 });
    });
    console.log(data);
    return upload.fields(data);
}


module.exports = imageUpload;