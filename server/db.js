var { Schema } = require("mongoose");
const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/diamante")
  .then(() => {
    console.log("Connected to mongodb");
  })
  .catch((err) => {
    console.log("Error connecting to mongodb: ", err);
  });

const accountSchema = new Schema({
  secretKey: {
    type: String,
    require: true,
  },
  publicKey: {
    type: String,
    require: true,
  },
});
const account = mongoose.model("Blog", accountSchema);
module.exports = { account };
