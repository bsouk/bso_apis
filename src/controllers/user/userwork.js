const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");

exports.createBuyerProfile = async (req, res) => {
    try {

    } catch (err) {
        utils.handleError(res, err);
    }
}