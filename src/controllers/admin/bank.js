const utils = require("../../utils/utils");
const Bank=require('../../models/bank')
exports.addEditBank=async(req,res)=>{
    try {
        const exists = await Bank.find();
        if (exists.length > 0) {
            const result = await Bank.findOneAndUpdate({ _id: exists[0]._id }, { $set: req.body }, { new: true })
            return res.json({ message: "Bank updated successfully", data: result, code: 200 });
        }else{
            const result = await Bank.create(req.body);
            return res.json({ message: "Bank created successfully", data: result, code: 200 });
        }

    } catch (error) {
        utils.handleError(res, error);
    }
}
exports.getBank=async(req,res)=>{
    try {
        const result = await Bank.find();
        return res.json({ message: "Bank fetched successfully", data: result, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}