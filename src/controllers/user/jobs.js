const { default: mongoose } = require("mongoose");
const utils = require("../../utils/utils");

exports.createJob = async (req, res) => {
    try {
        const data = req.body
    } catch (error) {
        utils.handleError(res, error);
    }
}