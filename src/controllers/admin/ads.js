const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const Ads = require("../../models/ads");

exports.addAds = async (req, res) => {
    try {
        const result = await Ads.create(req.body)

        res.json({ message: "Ads Banner added successfully", data: result, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
}
