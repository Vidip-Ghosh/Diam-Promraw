const express = require("express");
const app = express();
var diamSDK = require("diamante-sdk-js");
var savePagingToken = require("diamante-sdk-js");
const { account } = require("./db");

const pair = diamSDK.Keypair.random();
const secretKey = pair.secret();
const publicKey = pair.publicKey();
console.log("Secret Key: ", secretKey);
console.log("Public Key: ", publicKey);

const server = new diamSDK.Horizon.Server("https://diamtestnet.diamcircle.io/");

app.post("/createAccount", async (req, res) => {
  try {
    const response = await fetch(
      `https://friendbot.diamcircle.io?addr=${encodeURIComponent(publicKey)}`
    );
    const responseJSON = await response.json();
    console.log("Success! You have a new account: ", responseJSON);
  } catch (error) {
    console.log("Error: ", error);
  }
  try {
    var parentAccount = await server.loadAccount(publicKey);
    var childAccount = diamSDK.Keypair.random();

    var createAccountTx = new diamSDK.TransactionBuilder(parentAccount, {
      fee: diamSDK.BASE_FEE,
      networkPassphrase: diamSDK.Networks.TESTNET,
    });

    createAccountTx = await createAccountTx
      .addOperation(
        diamSDK.Operation.createAccount({
          destination: childAccount.publicKey(),
          startingBalance: "5",
        })
      )
      .setTimeout(180)
      .build();
    console.log(createAccountTx);
    let txResponse = await server
      .submitTransaction(createAccountTx)
      // some simple error handling
      .catch(function (error) {
        console.log("there was an error");
        console.log(error.response);
        console.log(error.status);
        console.log(error.extras);
        return error;
      });
    console.log(txResponse);
    console.log("Created the new account", childAccount.publicKey());
    return res.status(201).json({ message: "Success! You have a new account" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error!!!" });
  }
});

app.get("/getAccount", async (req, res) => {
  const account = await server.loadAccount(publicKey);
  console.log("Accounts fetched successfully", account);
  return res.status(200).json({ message: "Accounts fetched successfully!!!!" });
});

app.post("/sendPayments", async (req, res) => {
  var sourceKeys = diamSDK.Keypair.fromSecret(
    "SBHEM5I5Q7WVMEONYDQZ4X3K45CKNYR2YIQWPCPKGHUMWCY3JTCWJY5F"
  );
  var destinationId =
    "GCCDAZ3ZTABRR2LLUTVCU3TNTEWKAPFACZCPJRA5NRNHMAGVNAWCTZXE";
  var transaction;
  server
    .loadAccount(destinationId)
    .catch((err) => {
      if (err instanceof diamSDK.NotFoundError) {
        throw new Error("The destination account does not exist!");
      } else {
        return err;
      }
    })
    .then(() => {
      return server.loadAccount(sourceKeys.publicKey());
    })
    .then((sourceAccount) => {
      transaction = new diamSDK.TransactionBuilder(sourceAccount, {
        fee: diamSDK.BASE_FEE,
        networkPassphrase: diamSDK.Networks.TESTNET,
      })
        .addOperation(
          diamSDK.Operation.payment({
            destination: destinationId,
            asset: diamSDK.Asset.native(),
            amount: "10",
          })
        )
        .addMemo(diamSDK.Memo.text("Test transaction"))
        .setTimeout(180)
        .build();
      transaction.sign(sourceKeys);
      return server.submitTransaction(transaction);
    })
    .then((res) => {
      console.log("Transaction successful!", res);
    })
    .catch((err) => {
      console.log(err);
    });
  return res.status(200).json({ message: "Payment Successfull!!!" });
});

app.get("/receivePayments", async (req, res) => {
  try {
    const sourceKeys = diamSDK.Keypair.fromSecret(
      "SBHEM5I5Q7WVMEONYDQZ4X3K45CKNYR2YIQWPCPKGHUMWCY3JTCWJY5F"
    );
    const destinationId =
      "GCCDAZ3ZTABRR2LLUTVCU3TNTEWKAPFACZCPJRA5NRNHMAGVNAWCTZXE";

    // Create the payments request
    const paymentsRequest = server.payments().forAccount(destinationId);
    console.log("Payments request: ", paymentsRequest);

    // Stream payments
    paymentsRequest.stream({
      onmessage: (payment) => {
        savePagingToken(payment.paging_token);
        var asset;
        if (payment.asset_type === "native") {
          asset = "diam";
        } else {
          asset = payment.asset_code + ":" + payment.asset_issuer;
        }

        console.log(payment.amount + " " + asset + " from " + payment.from);
      },
      onerror: (err) => {
        console.error("Error in payment stream: ", err);
      },
    });

    // Respond to the request
    return res.status(200).json({ message: "Streaming payments" });
  } catch (error) {
    console.log("Error: ", error);
    return res
      .status(500)
      .json({ message: "Error receiving payments", error: error.message });
  }
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});
