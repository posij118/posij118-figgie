const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");

const INFINITY = 1000000000;
const suitTypeIdentifiers = [
  "bidsClubs",
  "offersClubs",
  "bidsSpades",
  "offersSpades",
  "bidsDiamonds",
  "offersDiamonds",
  "bidsHearts",
  "offersHearts",
];

const getSuitNameFromSuitTypeIndentifier = (suitTypeIdentifier) => {
  if (suitTypeIdentifiers.includes(suitTypeIdentifier))
    return new RegExp("bid").test(suitTypeIdentifier)
      ? suitTypeIdentifier.slice(4).toLowerCase()
      : suitTypeIdentifier.slice(6).toLowerCase();
  else return null;
};

const getTypeFromSuitTypeIdentifier = (
  suitTypeIdentifier,
  returnIfBid,
  returnIfOffer
) => {
  if (suitTypeIdentifiers.includes(suitTypeIdentifier))
    return new RegExp("bid").test(suitTypeIdentifier)
      ? returnIfBid
      : returnIfOffer;
  else return null;
};

const orderComparator = (orderA, orderB) => {
  let directionConstant;
  if (orderA.type === "buy") directionConstant = 1;
  else directionConstant = -1;
  return (
    directionConstant * INFINITY * (orderB.price - orderA.price) +
    (orderA.timestamp.getTime() - orderB.timestamp.getTime())
  );
};

const capitalize = (str) => {
  return str[0].toUpperCase() + str.slice(1);
};

const zip = (x, y) =>
  Array.from(Array(Math.max(x.length, y.length)), (_, i) => [x[i], y[i]]);

function tryParseJSONObject(jsonString) {
  try {
    var o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {}

  return false;
}

const throwError = (message) => {
  throw new Error(message);
};

const sleep = (ms) => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, ms)
  );
};

module.exports.getSuitNameFromSuitTypeIndentifier =
  getSuitNameFromSuitTypeIndentifier;
module.exports.getTypeFromSuitTypeIdentifier = getTypeFromSuitTypeIdentifier;
module.exports.orderComparator = orderComparator;
module.exports.capitalize = capitalize;
module.exports.zip = zip;
module.exports.tryParseJSONObject = tryParseJSONObject;
module.exports.throwError = throwError;
module.exports.sleep = sleep;
