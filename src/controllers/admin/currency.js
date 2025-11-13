const mongoose = require('mongoose');
const Currency = require('../../models/currency');
const utils = require('../../utils/utils');

/**
 * Build query for listing currencies
 */
const buildListQuery = ({ status, search }) => {
  const query = {};

  if (status && ['active', 'inactive'].includes(status)) {
    query.status = status;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [
      { code: regex },
      { name: regex },
      { symbol: regex },
    ];
  }

  return query;
};

/**
 * Normalize payload fields
 */
const normalizePayload = (payload = {}) => {
  const data = { ...payload };

  if (data.code) {
    data.code = data.code.toUpperCase();
  }

  if (data.name) {
    data.name = data.name.trim();
  }

  if (data.symbol) {
    data.symbol = data.symbol.trim();
  }

  if (data.status && !['active', 'inactive'].includes(data.status)) {
    delete data.status;
  }

  if (data.decimal_digits !== undefined) {
    const digits = Number(data.decimal_digits);
    if (Number.isNaN(digits) || digits < 0 || digits > 6) {
      delete data.decimal_digits;
    } else {
      data.decimal_digits = digits;
    }
  }

  if (data.exchange_rate !== undefined) {
    const rate = Number(data.exchange_rate);
    if (Number.isNaN(rate) || rate < 0) {
      delete data.exchange_rate;
    } else {
      data.exchange_rate = rate;
    }
  }

  if (data.is_default !== undefined) {
    data.is_default = Boolean(data.is_default);
  }

  return data;
};

/**
 * Create a new currency
 */
exports.createCurrency = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const { code, name, symbol } = payload;

    if (!code || !name || !symbol) {
      return utils.handleError(res, utils.buildErrObject(400, 'Code, name and symbol are required'));
    }

    const existing = await Currency.findOne({ code });
    if (existing) {
      return utils.handleError(res, utils.buildErrObject(400, 'Currency code already exists'));
    }

    if (payload.is_default) {
      await Currency.updateMany({}, { is_default: false });
    }

    const currency = await Currency.create(payload);

    return res.json({
      message: 'Currency created successfully',
      data: currency,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Get currencies list
 */
exports.getCurrencies = async (req, res) => {
  try {
    const {
      limit = 10,
      offset = 0,
      status,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const numericLimit = Math.min(Number(limit) || 10, 100);
    const numericOffset = Number(offset) || 0;
    const sortOrder = order === 'asc' ? 1 : -1;

    const query = buildListQuery({ status, search });

    const [data, count] = await Promise.all([
      Currency.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(numericOffset)
        .limit(numericLimit),
      Currency.countDocuments(query),
    ]);

    return res.json({
      message: 'Currency list fetched successfully',
      data,
      count,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Get currency by id
 */
exports.getCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(422, 'ID_MALFORMED'));
    }

    const currency = await Currency.findById(id);
    if (!currency) {
      return utils.handleError(res, utils.buildErrObject(404, 'Currency not found'));
    }

    return res.json({
      message: 'Currency fetched successfully',
      data: currency,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Update currency
 */
exports.updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(422, 'ID_MALFORMED'));
    }

    const payload = normalizePayload(req.body);

    if (payload.code) {
      const existing = await Currency.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        code: payload.code,
      });
      if (existing) {
        return utils.handleError(res, utils.buildErrObject(400, 'Currency code already exists'));
      }
    }

    if (payload.is_default) {
      await Currency.updateMany({}, { is_default: false });
    }

    const currency = await Currency.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    if (!currency) {
      return utils.handleError(res, utils.buildErrObject(404, 'Currency not found'));
    }

    return res.json({
      message: 'Currency updated successfully',
      data: currency,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Delete currency
 */
exports.deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(422, 'ID_MALFORMED'));
    }

    const currency = await Currency.findById(id);
    if (!currency) {
      return utils.handleError(res, utils.buildErrObject(404, 'Currency not found'));
    }

    if (currency.is_default) {
      return utils.handleError(res, utils.buildErrObject(400, 'Default currency cannot be deleted'));
    }

    await Currency.deleteOne({ _id: id });

    return res.json({
      message: 'Currency deleted successfully',
      data: currency,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Set default currency
 */
exports.setDefaultCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return utils.handleError(res, utils.buildErrObject(422, 'ID_MALFORMED'));
    }

    const currency = await Currency.findById(id);
    if (!currency) {
      return utils.handleError(res, utils.buildErrObject(404, 'Currency not found'));
    }

    await Currency.updateMany({}, { is_default: false });
    currency.is_default = true;
    currency.status = 'active';
    await currency.save();

    return res.json({
      message: 'Default currency updated successfully',
      data: currency,
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};



