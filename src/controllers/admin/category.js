const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const ProductCategory = require("../../models/product_category");
const ProductSubCategory = require("../../models/product_sub_category");



exports.addProductCategory = async (req, res) => {
    try {
      const { icon, name } = req.body;
  
      const isCategoryExists = await ProductCategory.findOne({ name: name });
      if (isCategoryExists)
        return utils.handleError(res, {
          message: "This category already exist",
          code: 400,
        });
  
      const category = new ProductCategory({ icon, name });
      await category.save();
      res.json({ message: "Category added successfully", code: 200 });
    } catch (error) {
      utils.handleError(res, error);
    }
  };


exports.productCategories = async (req, res) => {
    try {
      const { search, offset = 0, limit = Number.MAX_SAFE_INTEGER } = req.query;
  
      const filter = {};
      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }
  
      const catergories = await ProductCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      const count = await ProductCategory.countDocuments(filter);
  
      res.json({ data: catergories, count, code: 200 });
    } catch (error) {
      utils.handleError(res, error);
    }
  };
  
 exports.getProductCategory = async (req, res) => {
    try {
      const id = req.params.id;
  
      const catergory = await ProductCategory.findById(id);
  
      res.json({ data: catergory, code: 200 });
    } catch (error) {
      utils.handleError(res, error);
    }
  };
  
exports.editProductCategory = async (req, res) => {
    try {
      const { icon, name, vat } = req.body;
      const id = req.params.id;
  
      const isCategoryExists = await ProductCategory.findById(id);
      if (!isCategoryExists)
        return utils.handleError(res, {
          message: "Category not found",
          code: 404,
        });
  
      isCategoryExists.icon = icon;
      isCategoryExists.name = name;
      isCategoryExists.vat = vat;
  
      await isCategoryExists.save();
  
      res.json({ message: "Category edited successfully", code: 200 });
    } catch (error) {
      utils.handleError(res, error);
    }
  };
  
 exports.deleteProductCategory = async (req, res) => {
    try {
      const id = req.params.id;
  
      const isCategoryExists = await ProductCategory.findById(id);
      if (!isCategoryExists)
        return utils.handleError(res, {
          message: "Category not found",
          code: 404,
        });
  
      await ProductCategory.findByIdAndDelete(id);
      const image = isCategoryExists.icon;
  
      if (image) {
        await removeFilesFromS3(image);
      }
  
      res.json({ message: "Category deleted successfully", code: 200 });
    } catch (error) {
      utils.handleError(res, error);
    }
  };
  
  exports.addProductSubCategory=async (req,res)=>{

    try{
   const {name,icon,product_category_id}=req.body

   if(!name || !icon  || !product_category_id) return res.json({"message":"Send valid data", "code":500})
    
    const isSubCategoryExist=await ProductSubCategory.findOne({name, product_category_id});

    if(isSubCategoryExist) return res.json({"message":"Subcategory already exist for this category", "code":500});
       
    const newSubCategory=new ProductSubCategory({name,icon,product_category_id});
         await newSubCategory.save();
     return res.json({"message":"Subcategory added successfully", "code":500})

    }catch(error){
    utils.handleError(res, error);

    }
  }