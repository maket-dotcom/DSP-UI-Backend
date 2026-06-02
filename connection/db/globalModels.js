const { isUndefinedOrNull } = require("../../utils/validators");

// Singleton pattern implementation for ModelsInitializer
let models = null;

const ModelsInitializer = {
    setModels: (data) => {
        models = data;
    },
    getModels: () => {
        return models;
    }
}


module.exports = ModelsInitializer;
