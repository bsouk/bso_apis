const mongoose = require('mongoose')
const requestIp = require('request-ip')
const { validationResult } = require('express-validator')
const { admin } = require("../config/firebase")
const moment = require("moment")
const { capitalizeFirstLetter } = require("./helpers")
const path = require("path")
const crypto = require('crypto')
const secret = process.env.JWT_SECRET
const algorithm = 'aes-256-cbc'
const key = crypto.scryptSync(secret, 'salt', 32)
const iv = Buffer.alloc(16, 0) // Initialization crypto vector
var bcrypt = require('bcrypt');
const axios = require('axios');
const twilio = require('twilio');
const {
  uploadVideo,
} = require("./helpers");

const fs = require("fs")
const sharp = require("sharp")
const Notification = require("../models/notification")
const FCMDevice = require("../models/fcm_devices")
const
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path,
  ffprobePath = require("@ffprobe-installer/ffprobe").path,
  ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);


const xlsx = require("xlsx")
const csv = require("csvtojson");

const { stringify } = require('csv-stringify');
// const PDFDocument = require('pdfkit');
const PDFDocument = require('pdfkit-table');
const XLSX = require('xlsx');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = new twilio(accountSid, authToken);
const AWS = require("aws-sdk");
const ACCESS_KEY = process.env.ACCESS_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const Bucket = process.env.Bucket;
const REGION = process.env.REGION;

var bucket = new AWS.S3({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
  region: REGION,
});


/**
 * Removes extension from file
 * @param {string} file - filename
 */
exports.removeExtensionFromFile = file => {
  return file
    .split('.')
    .slice(0, -1)
    .join('.')
    .toString()
}

/**
 * Gets IP from user
 * @param {*} req - request object
 */
exports.getIP = req => requestIp.getClientIp(req)

/**
 * Gets browser info from user
 * @param {*} req - request object
 */
exports.getBrowserInfo = req => req.headers['user-agent']

/**
 * Gets country from user using CloudFlare header 'cf-ipcountry'
 * @param {*} req - request object
 */
exports.getCountry = req =>
  req.headers['cf-ipcountry'] ? req.headers['cf-ipcountry'] : 'XX'

/**
 * Handles error by printing to console in development env and builds and sends an error response
 * @param {Object} res - response object
 * @param {Object} err - error object
 */
exports.handleError = (res, err) => {
  // Prints error in console
  if (process.env.NODE_ENV === 'development') {
    console.log(err)
  }
  // Sends error to user

  function getValidCode(code) {
    code = parseInt(code);
    const isValid = code >= 100 && code < 600;
    return isValid ? code : 500
  }

  res.status(getValidCode(err?.code)).json({
    errors: {
      msg: err.message
    },
    code: getValidCode(err?.code)
  })
}

/**
 * Builds error object
 * @param {number} code - error code
 * @param {string} message - error text
 */

exports.buildErrObject = (code, message) => {
  return {
    code,
    message
  }
}

/**
 * Builds error for validation files
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Object} next - next object
 */
exports.validationResult = (req, res, next) => {
  try {
    validationResult(req).throw()
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase()
    }
    return next()
  } catch (err) {
    return this.handleError(res, this.buildErrObject(422, err.array()))
  }
}

/**
 * Builds success object
 * @param {string} message - success text
 */
exports.buildSuccObject = message => {
  return {
    msg: message
  }
}

/**
 * Checks if given ID is good for MongoDB
 * @param {string} id - id to check
 */
exports.isIDGood = async id => {
  return new Promise((resolve, reject) => {
    const goodID = mongoose.Types.ObjectId.isValid(id)
    return goodID
      ? resolve(id)
      : reject(this.buildErrObject(422, 'ID_MALFORMED'))
  })
}

/**
 * Item not found
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
exports.itemNotFound = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (!item) {
    reject(this.buildErrObject(404, message))
  }
}

/**
 * Item already exists
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
exports.itemAlreadyExists = (err, item, reject, message) => {
  console.log(item);
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (item) {
    reject(this.buildErrObject(422, message))
  }
}

exports.itemExists = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (!item) {
    reject(this.buildErrObject(422, message))
  }
}

exports.objectToQueryString = async obj => {
  return new Promise((resolve, reject) => {
    const searchParams = new URLSearchParams();
    const params = obj;
    Object.keys(params).forEach(key => searchParams.append(key, params[key]));
    resolve(searchParams.toString())
  })
}

/**
 * Fetch country code from data
 * @param {Object} obj - Country Info
 */
exports.getCountryCode = obj => {
  return {
    country_code: obj.country
  }
}

/**
 * Notification 
 */


exports.sendNotification = async (token, notificationData) => {
  try {
    // Ensure that the token is valid and not empty
    if (!token) {
      console.error("Invalid token provided.");
      return;
    }
    console.log('notificationData', notificationData)
    const message = {
      notification: {
        title: notificationData.title,
        body: notificationData.description,  // Corrected description field name to "body"
      },
      token: token  // This should be the user's FCM token
    };
    console.log("message : ", message)
    // Send the notification using Firebase Admin SDK
    await admin.messaging().send(message);
    console.log("Notification sent successfully to the user.");

  } catch (error) {
    console.error("Error sending notification:", error);
  }
};


exports.sendPushNotification = async (
  notificaiton,
  create = true,
  push = true
) => {
  try {

    if (create) {
      const notificationForSeller = new Notification(notificaiton);
      await notificationForSeller.save();
    }

    const fcm_device = await FCMDevice.findOne({ user_id: new mongoose.Types.ObjectId(notificaiton.receiver_id) });
    const token = fcm_device?.token ?? ""

    if (push && token) {
      const notificationData = {
        title: notificaiton.title,
        body: notificaiton.description,
      };
      var message = {
        notification: notificationData,
        tokens: [token],
      };

      admin
        .messaging()
        .sendMulticast(message)
        .then((response) => {
          console.log("response", response.responses[0].error)
          if (response.failureCount > 0) {
            console.log("Failed notification count", response.failureCount)
          } else {
            console.log("Notification sent successfully")
          }
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });
    }

  } catch (err) {
    console.log(err);
    return false;
  }
};

/**
 * Checks is password matches
 * @param {string} password - password
 * @param {Object} user - user object
 * @returns {boolean}
 */

exports.checkPassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.comparePassword(password, (err, isMatch) => {
      if (err) {
        console.log('err---->', err);
        reject(this.buildErrObject(422, err.message))
      }
      console.log('isMatch--xxxxxxxxx-------->', isMatch);
      if (!isMatch) {
        resolve(false)
      }
      resolve(true)
    })
  })
}

/**
 * Encrypts text
 * @param {string} text - text to encrypt
*/

exports.encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

/**
 * Decrypts text
 * @param {string} text - text to decrypt
*/

exports.decrypt = (text) => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  try {
    let decrypted = decipher.update(text, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    return err
  }
}

exports.generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
}


exports.generateThumbnail = async (videoPath, outputLocation) => {
  videoPath = encodeURI(videoPath)
  console.log("vidoePath", videoPath)
  return new Promise((resolve, reject) => {
    const thumbnailFilename = Date.now() + 'thumbnail.png';
    const outputDirectory = `${process.env.SERVER_STORAGE_PATH}/${outputLocation}`;
    ffmpeg(videoPath)
      .on('end', async () => {

        //comment for s3
        // resolve(path.join(outputLocation, thumbnailFilename));
        //comment for s3

        //uncomment for s3
        const filePath = path.join(outputDirectory, thumbnailFilename)
        const thumbnailBuffer = fs.readFileSync(filePath)
        fs.unlinkSync(filePath);

        const file = {
          name: thumbnailFilename,
          data: thumbnailBuffer,
          mimetype: "image/webp"
        };

        const basePath = `${process.env.STORAGE_PATH}/post`;

        let media = await uploadVideo({
          file: file,
          path: basePath,
        });

        resolve(`post/${media}`)
        //uncomment for s3
      })
      .on('error', (err) => {
        reject(err);
      })
      .screenshots({
        timestamps: ['50%'],
        filename: thumbnailFilename,
        size: '320x240',
        folder: outputDirectory
      });
  });

}

function removeExtensionFromFile(file) {
  return file
    .split('.')
    .slice(0, -1)
    .join('.')
    .toString()
}


function changeNameToWebpExtention(name) {
  let nameWithoutExtention = removeExtensionFromFile(name);
  const nameWithWebpExtention = nameWithoutExtention + ".webp";
  return nameWithWebpExtention;
}

// async function uploadFile(object) {
//   return new Promise(async (resolve, reject) => {
//     var file = object.file;
//     var filename = Date.now() + file.name;
//     const params = {
//       Bucket: Bucket,
//       Key: object.path + "/" + filename,
//       Body: file.data,
//       ContentType: file.mimetype,
//     };
//     return bucket.upload(params, function (err, data) {
//       if (err) {
//         console.log("----err----", err);
//         reject({ message: err.message, code: 400 });
//       }
//       console.log("data", data);
//       resolve(filename);
//     });
//   });
// }

async function uploadFileToS3Bucket(object) {
  return new Promise(async (resolve, reject) => {
    var file = object.file;
    var filename = Date.now() + file.name;
    const params = {
      Bucket: Bucket,
      Key: object.path + "/" + filename,
      Body: file.data,
      ContentType: file.mimetype,
    };
    return bucket.upload(params, function (err, data) {
      if (err) {
        console.log("----err----", err);
        reject({ message: err.message, code: 400 });
      }
      console.log("data", data);
      resolve(filename);
    });
  });
}

exports.uploadFileToS3Bucket = uploadFileToS3Bucket;

exports.uploadFileToS3Bucket = async (object) => {
  return new Promise(async (resolve, reject) => {
    var file = object.file;
    var filename = Date.now() + file.name;
    const params = {
      Bucket: Bucket,
      Key: object.path + "/" + filename,
      Body: file.data,
      ContentType: file.mimetype,
    };
    return bucket.upload(params, function (err, data) {
      if (err) {
        console.log("----err----", err);
        reject({ message: err.message, code: 400 });
      }
      console.log("data", data);
      resolve(filename);
    });
  });
}

exports.uploadFile = async (object) => {
  return new Promise((resolve, reject) => {
    var obj = object.file;
    var name = Date.now() + obj.name;
    obj.mv(object.path + "/" + name, function (err) {
      if (err) {
        console.log(err)
        reject(err);
      }
      resolve(name);
    });
  });
}

exports.uploadImage = async (object) => {
  return new Promise(async (resolve, reject) => {
    try {
      var obj = object.file;
      const nameWithWebpExtention = changeNameToWebpExtention(obj.name);
      const imageDataBuffer = obj.data;
      const webpBuffer = await sharp(imageDataBuffer)
        .toFormat("webp", { lossless: false })
        .toBuffer();

      object.file.name = nameWithWebpExtention;
      object.file.data = webpBuffer;
      const name = await uploadFile(object);
      resolve(name);
    } catch (conversionError) {
      console.error("Error converting image to WebP:", conversionError);
      reject(conversionError);
    }
  });
}

exports.uploadImageToBucket = async (object) => {
  return new Promise(async (resolve, reject) => {
    try {
      var obj = object.file;
      const nameWithWebpExtention = changeNameToWebpExtention(obj.name);
      const imageDataBuffer = obj.data;
      const webpBuffer = await sharp(imageDataBuffer)
        .toFormat("webp", { lossless: false })
        .toBuffer();

      object.file.name = nameWithWebpExtention;
      object.file.data = webpBuffer;
      const name = await uploadFileToS3Bucket(object);
      resolve(name);
    } catch (conversionError) {
      console.error("Error converting image to WebP:", conversionError);
      reject(conversionError);
    }
  });
}




exports.jsonConverterFromExcel = (categoryFileData) => {
  const workbook = xlsx.read(categoryFileData, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
  return jsonData;
}


exports.jsonConverterFromCsv = async (categoryFileData) => {
  const jsonData = await csv().fromString(categoryFileData.toString());
  return jsonData;
}


exports.validateColumns = (jsonData, requiredColumns) => {

  return new Promise((resolve, reject) => {
    try {
      if (jsonData.length === 0) {
        return reject({ message: "Excel file is empty", code: 400 })
      }

      const missingColumns = [];

      for (const column of requiredColumns) {
        if (!jsonData[0].hasOwnProperty(column)) {
          missingColumns.push(column)
        }
      }

      if (missingColumns.length === 0) {
        return resolve(true)
      } else {
        const errorMessage = missingColumns.length === 1
          ? `The following coloumn is missing: ${missingColumns[0]}`
          : `The following coloumns are missing: ${missingColumns.join(', ')}`;
        return reject({ message: errorMessage, code: 400 });
      }

    } catch (error) {
      reject(error)
    }
  })
}


exports.generateExcel = async (data, res) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
  return res.send(workbook);
}

exports.generateCSV = async (data, res) => {
  stringify(data, { header: true }, (err, output) => {
    if (err) {
      console.error('Error generating CSV:', err);
      return res.status(500).send('Error generating CSV');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
    return res.send(output);
  });
}

// function generatePDF(data, res) {
//     const doc = new PDFDocument();
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename="data.pdf"');

//     doc.pipe(res);
//     data.forEach((item, index) => {
//         doc.fontSize(16).text(`Record ${index + 1}`, { underline: true }).moveDown(0.5);

//         Object.entries(item).forEach(([key, value]) => {
//             doc.fontSize(12).text(`${key}: ${value}`, { indent: 20 });
//         });

//         doc.moveDown(1);
//     });
//     doc.end();
// }

exports.generatePDF = async (headers, data, res) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="data.pdf"');

  doc.pipe(res);

  doc.fontSize(18).text("Report", { align: 'center' }).moveDown(1);

  if (!data || data.length === 0) {
    doc.fontSize(14).text("No data available", { align: 'center' });
    doc.end();
    return doc;
  }

  const columnWidths = headers.map(header => {
    const maxContentWidth = Math.max(...data.map(row => String(row[header] || "").length), header.length);
    return Math.min(200, maxContentWidth * 5); // Max 200px width per column
  });

  const table = {
    headers: headers.map((header, i) => ({
      label: header,
      property: header,
      width: columnWidths[i] + 8, // Dynamically adjust width
      align: 'left',
    })),
    rows: data.map(row => headers.map(header => row[header] || "N/A"))
  };

  await doc.table(table, {
    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
    prepareRow: (row, indexColumn, indexRow, rectRow) => {
      doc.font("Helvetica").fontSize(9);
      if (rectRow.y + rectRow.height > doc.page.height - 50) {
        doc.addPage();
      }
    },
  });

  doc.end();
}



exports.sendSMS = async (to, message) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: to,
      // messagingServiceSid: accountSid,
    });
    console.log("SMS sent:", response.sid);
    return response;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};