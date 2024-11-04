const { buildErrObject } = require("./utils");
const utils = require("./utils");

var mongoose = require("mongoose");
const querystring = require("querystring");
const fs = require("fs");
const sharp = require("sharp");
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

function changeNameToWebpExtention(name) {
  let nameWithoutExtention = utils.removeExtensionFromFile(name);
  const nameWithWebpExtention = nameWithoutExtention + ".webp";
  return nameWithWebpExtention;
}

// S3 BUCKET
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

module.exports = {
  /**
   * in case need to get id without requireAuth
   * @param {String} token - binary file with path
   */

  async getUserIdFromToken(token) {
    return new Promise((resolve, reject) => {
      const jwt = require("jsonwebtoken");
      const auth = require("../middleware/auth");
      jwt.verify(
        auth.decrypt(token),
        process.env.JWT_SECRET,
        (err, decoded) => {
          if (err) {
            reject(buildErrObject(401, "Unauthorized"));
          }
          resolve(decoded.data);
        }
      );
    });
  },

  /**
   * upload file to server
   * @param {Object} object - binary file with path
   */

  // async uploadFile(object) {
  //   console.log("object" , object)

  //   return new Promise((resolve, reject) => {
  //     var obj = object.file;
  //     var name = Date.now() + obj.name;
  //     obj.mv(object.path + "/" + name, function (err) {
  //       if (err) {
  //         console.log(err)
  //         reject(err);
  //       }
  //       resolve(name);
  //     });
  //   });
  // },

  //upload image to after converting to webp
  async uploadFile(object) {
    return new Promise((resolve, reject) => {
      var obj = object.file;
      var name = Date.now() + obj.name;
      const tempFilePath = object.path + "/temp_" + name;

      const nameWithWebpExtention = changeNameToWebpExtention(name);

      // const filePath = object.path + "/" + nameWithWebpExtention;

      obj.mv(tempFilePath, async function (err) {
        if (err) {
          console.log(err);
          reject(err);
        }

        try {
          const imageDataBuffer = fs.readFileSync(tempFilePath);
          const webpBuffer = await sharp(imageDataBuffer)
            .toFormat("webp", { lossless: false })
            .toBuffer();

          // fs.writeFileSync(filePath, webpBuffer);

          object.file.name = nameWithWebpExtention;
          object.file.data = webpBuffer;
          const name = await uploadFileToS3Bucket(object);
          resolve(name);

          fs.unlinkSync(tempFilePath);
          // resolve(nameWithWebpExtention);
        } catch (conversionError) {
          console.error("Error converting image to WebP:", conversionError);
          reject(conversionError);
        }
      });
    });
  },

  // upload image to after converting to webp and upload to s3
  // async uploadFile(object) {

  //   return new Promise((resolve, reject) => {
  //     var obj = object.file;
  //     var name = Date.now() + obj.name;
  //     const tempFilePath = object.path + "/temp_" + name;

  //     const nameWithWebpExtention = changeNameToWebpExtention(name)

  //     obj.mv(tempFilePath, async function (err) {
  //       if (err) {
  //         console.log(err)
  //         reject(err);
  //       }

  //       try {
  //         const imageDataBuffer = fs.readFileSync(tempFilePath);
  //         const webpBuffer = await sharp(imageDataBuffer)
  //           .toFormat('webp', { lossless: false })
  //           .toBuffer();

  //         object.file.name = changeNameToWebpExtention(obj.name)
  //         object.file.data = webpBuffer
  //         const name = await uploadFileToS3Bucket(object);

  //         fs.unlinkSync(tempFilePath);
  //         resolve(name);
  //       } catch (conversionError) {
  //         console.error('Error converting image to WebP:', conversionError);
  //         reject(conversionError);
  //       }
  //     });
  //   });

  // },

  // async uploadVideo(object) {

  //   return new Promise((resolve, reject) => {
  //     var obj = object.file;
  //     var name = Date.now() + obj.name;
  //     obj.mv(object.path + "/" + name, function (err) {
  //       if (err) {
  //         console.log(err)
  //         reject(err);
  //       }
  //       resolve(name);
  //     });
  //   });
  // },

  // S3
  async uploadVideo(object) {
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
          reject(buildErrObject(422, err.message));
        }
        console.log("data", data);
        resolve(filename);
      });
    });
  },

  async uploadFileForBulkUpload(imagePath, name, path) {
    return new Promise(async (resolve, reject) => {
      console.log("imagePath, name , path", imagePath, name, path);
      const nameWithWebpExtention = changeNameToWebpExtention(name);
      try {
        const imageDataBuffer = fs.readFileSync(imagePath);
        const webpBuffer = await sharp(imageDataBuffer)
          .toFormat("webp", { lossless: false })
          .toBuffer();

        const object = {
          file: {
            name: nameWithWebpExtention,
            data: webpBuffer,
            mimetype: "image/webp",
          },
          path: path,
        };

        const name = await uploadFileToS3Bucket(object);
        resolve(name);
        fs.unlinkSync(imagePath);
      } catch (conversionError) {
        console.error("Error converting image to WebP:", conversionError);
        reject(conversionError);
      }
    });
  },

  // S3 BUCKET
  // async uploadFileToS3Bucket(object) {
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
  //         reject(buildErrObject(422, err.message));
  //       }
  //       console.log("data", data)
  //       resolve(file.name);
  //     });
  //   });
  // },

  //   async uploadFile(object){
  //   return new Promise(async (resolve, reject) => {
  //     var file = object.image_data;
  //     console.log("OBJ in upload file is here---", file);

  //     var filename = Date.now() + file.name;
  //     const params = {
  //       Bucket: Bucket,
  //       Key: object.path + "/" + filename,
  //       Body: file.data,
  //       ContentType: file.mimetype,
  //     };
  //     return bucket.upload(params, function (err, data) {
  //       if (err) {
  //         console.log("----err----",err);
  //         reject(buildErrObject(422, err.message));
  //       }
  //       resolve({ success: true, data: data });
  //     });
  //   });
  // },

  async removeFilesFromS3(imageUrl) {
    return new Promise(async (resolve, reject) => {
      try {
        let Objects = [];
        if (Array.isArray(imageUrl)) {
          Objects = imageUrl.map((single) => {
            return {
              Key: `public/${single}`,
            };
          });
        } else {
          Objects = [
            {
              Key: `public/${imageUrl}`,
            },
          ];
        }

        console.log("Objects", Objects);

        const params = {
          Bucket: Bucket,
          Delete: {
            Objects: Objects,
            Quiet: false,
          },
        };

        bucket.deleteObjects(params, (err, data) => {
          if (err) {
            console.log("Error deleting objects:", err);
          } else {
            console.log("Successfully deleted objects:", data.Deleted);
          }
        });

        resolve(true);
      } catch (error) {
        console.error("ERROR:", error);
        reject(error);
      }
    });
  },

  /**
   * capitalize first letter of string
   * @param {string} string
   */

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  /**
   * generate random string
   * @param {string} string
   */

  async customRandomString(
    length,
    chars = "abcdefghijklmnopqrstuvwxyz@1234567890!"
  ) {
    var result = "";
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },

  /**
   * generate random string
   * @param {string} string
   */

  automatedString() {
    return Math.random().toString(36).slice(2);
  },

  /**
   * convert a given array of string to mongoose ids
   * @param {Array} array
   */

  convertToObjectIds(array) {
    return array.map((item) => new mongoose.Types.ObjectId(item));
  },

  /**
   * convert a given  string to mongoose id
   * @param {String} id
   */

  convertToObjectId(id) {
    return new mongoose.Types.ObjectId(id);
  },

  /**
   * convert title to slug
   * @param {String} title
   */
  async createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  },

  /**
   * Validate the size
   * @param {File} file
   * @param {Number} fize size in Byte
   */
  async validateFileSize(file, size) {
    return new Promise(async (resolve, reject) => {
      try {
        if (file.size > size) {
          reject(
            buildErrObject(422, `File should be less than ${size / 1048576} MB`)
          ); // convert byte to MB
        }
        resolve({
          success: true,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  /**
   * Object to Query string
   * @param {Object} obj
   */
  async objectToQueryString(obj) {
    let result = querystring.stringify(obj);
    return result;
  },
};
