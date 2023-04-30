"use strict";
const AWS = require("aws-sdk");
const DynamoDB = require("aws-sdk/clients/dynamodb");
const DocumentClient = new DynamoDB.DocumentClient({ region: "us-east-1" });

const isBookAvailable = (book, quantity) => {
  console.log("book quantity", book.quantity);
  console.log("quantity", quantity);
  let a = book.quantity - quantity > 0;
  console.log("a", a);
  return a;
};
module.exports.checkInventory = async ({ bookId, quantity }) => {
  try {
    let params = {
      TableName: "bookTable",
      KeyConditionExpression: "bookId = :bookId",
      ExpressionAttributeValues: {
        ":bookId": bookId,
      },
    };
    let result = await DocumentClient.query(params).promise();
    console.log("result", result);
    let book = result.Items[0];
    console.log("book", book);
    if (isBookAvailable(book, quantity)) {
      return book;
    } else {
      let bookOutOfStockError = new Error("The book is out of stock");
      bookOutOfStockError.name = "BookOutOfStock";
      throw bookOutOfStockError;
    }
  } catch (e) {
    console.log("error", e);
    if (e === "bookOutOfStockError") {
      return e;
    } else {
      let bookNotFoundError = new Error("The book is not found");
      bookNotFoundError.name = "BookNotFound";
      throw bookNotFoundError;
    }
  }
};

module.exports.calculateTotal = async ({ book, quantity }) => {
  let total = book.price * quantity;
  return { total };
};

const deductPoints = async (userId) => {
  let params = {
      TableName: 'userTable',
      Key: { 'userId': userId },
      UpdateExpression: 'set points = :zero',
      ExpressionAttributeValues: {
          ':zero': 0
      }
  };
  await DocumentClient.update(params).promise();
}
// redeemPoints
module.exports.redeemPoints = async ({ userId, total }) => {
  console.log("userId", userId);
  let orderTotal = total.total;
  try {
    let params = {
      TableName: "userTable",
      Key: {
        userId: userId,
      },
    };
    console.log("params", params);
    const result = await DocumentClient.get(params).promise();
    console.log("result", result);
    let user = result.Item;

    const points = user.points;
    console.log("points", points);

    if (orderTotal > points) {
      await deductPoints(userId);
      orderTotal = orderTotal - points;
      return {
        total: orderTotal,
        points,
      };
    } else {
      throw new Error("Order total is less than than redeem points");
    }
  } catch (error) {
    console.log("Error from redeemPoints", error);
    throw new Error(error);
  }
};

// billCustomer
module.exports.billCustomer = async (params) => {
  return "Successfully billed";
};
// restoreRedeemPoints
module.exports.restoreRedeemPoints = async ({ userId, total }) => {
  try {
    if (total.points) {
      let params = {
        TableName: "userTable",
        Key: { userId: userId },
        UpdateExpression: "set points = :points",
        ExpressionAttributeValues: {
          ":points": total.points,
        },
      };
      await DocumentClient.update(params).promise();
    }
  } catch (e) {
    throw new Error(e);
  }
};
