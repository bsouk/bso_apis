const { handleError } = require("../utils/utils")

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (e) {
        console.log(e?.errors?.[0])
        handleError(res, { message: e?.errors?.[0]?.message ?? "Please provide valid data", code: 400 })
    }
};

module.exports = validate

