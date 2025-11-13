const Currency = require('../../models/currency');
const utils = require('../../utils/utils');

exports.getCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find({ status: 'active' })
      .sort({ is_default: -1, name: 1 })
      .lean();

    return res.json({
      message: 'Currency list fetched successfully',
      data: currencies,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};



