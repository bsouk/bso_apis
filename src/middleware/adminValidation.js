const { z } = require('zod');

// const addressSchema = z.object({
//     address_line_1: z.string().optional(),
//     address_line_2: z.string().optional(),
//     pin_code: z.string().optional(),
//     state: z.string().optional(),
//     country: z.string({}).optional(),
//     pin_code : z.string({}).optional(),
// });

// exports.addUser = z.object({
//     profile_image: z.string({ required_error: 'Profile image is required' }),
//     company_name: z.string({ required_error: 'Company name is required' }).nonempty({ required_error: 'Company name cannot be empty' }),
//     full_name: z.string({ required_error: 'Full name is required' }).nonempty({ required_error: 'Full name cannot be empty' }),
//     email: z.string({ required_error: 'Email is required' }).email({ required_error: 'Email is not valid' }),
//     phone_number: z.string({ required_error: 'Phone number is required' }).nonempty({ required_error: 'Phone number cannot be empty' }),
//     address: addressSchema,
// });
