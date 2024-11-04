const { z } = require('zod');

// exports.addProduct = z.object({
//     name: z.string({ required_error: 'Product name is required' }).nonempty({ message: 'Product name cannot be empty' }),
//     additional_information: z.string({ required_error: 'Additional information is required' }).nonempty({ message: 'Additional information cannot be empty' }),
//     description: z.string({ required_error: 'Description is required' }).nonempty({ message: 'Description cannot be empty' }),
//     key_feature: z.array(z.string()).optional(),

//     tags: z.array(z.string()).optional(),
//     images: z.array(z.string()).min(1, { message: 'Atleast 1 Product image is required' }),
//     price: z.string({ required_error: 'Price is required' }).nonempty({ message: 'Price cannot be empty' }),
//     vat_percentage: z.string({ required_error: 'Vat percentage is required' }).nonempty({ message: 'Vat percentage cannot be empty' }),
//     vat_amount: z.string({ required_error: 'Vat amount is required' }).nonempty({ message: 'Vat amount cannot be empty' }),
//     price_after_vat: z.string({ required_error: 'Price after vat is required' }).nonempty({ message: 'Price after vat cannot be empty' }),
//     height: z.string({ required_error: 'Product height is required' }).nonempty({ message: 'Product height cannot be empty' }),
//     width: z.string({ required_error: 'Product width is required' }).nonempty({ message: 'Product width cannot be empty' }),
//     product_type: z.string({ required_error: 'Product type is required' }).nonempty({ message: 'Product type cannot be empty' }),
//     // color: z.string({ required_error: 'Color is required' }).nonempty({ message: 'Color cannot be empty' }),
//     brand_name: z.string({ required_error: 'Brand name is required' }).nonempty({ message: 'Brand name cannot be empty' }),
//     condition: z.string({ required_error: 'Product condition is required' }).nonempty({ message: 'Product condition cannot be empty' }),
//     product_category_id: z.string({ required_error: 'Category is required' }).nonempty({ message: 'Category cannot be empty' }),
//     product_sub_category_id: z.string({ required_error: 'Sub category is required' }).nonempty({ message: 'Sub category cannot be empty' }),
//     quantity: z.number({ required_error: 'Quantity is required' }).min(1, { message: 'Minimum 1 quantity is required' }),
// });

