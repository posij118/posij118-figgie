const INFINITY = 1000000000000000;

const getSuitNameFromSuitTypeIndentifier = (suitTypeIdentifier) => {
  return new RegExp("bid").test(suitTypeIdentifier)
    ? suitTypeIdentifier.slice(4).toLowerCase()
    : suitTypeIdentifier.slice(6).toLowerCase();
};

const getTypeFromSuitTypeIdentifier = (
  suitTypeIdentifier,
  returnIfBid,
  returnIfOffer
) => {
  return new RegExp("bid").test(suitTypeIdentifier)
    ? returnIfBid
    : returnIfOffer;
};

const orderComparator = (orderA, orderB) => {
  let directionConstant;
  if (type === "buy") directionConstant = 1;
  else directionConstant = -1;
  return (
    directionConstant * INFINITY * (orderB.price - orderA.price) +
    (new Date(orderB.timestamp).getTime() -
      new Date(orderA.timestamp).getTime())
  );
};


const capitalize = (str) => {
  return str[0].toUpperCase() + str.slice(1);
};

const zip = (x, y) =>
  Array.from(Array(Math.max(x.length, y.length)), (_, i) => [x[i], y[i]]);

module.exports.getSuitNameFromSuitTypeIndentifier =
  getSuitNameFromSuitTypeIndentifier;
module.exports.getTypeFromSuitTypeIdentifier = getTypeFromSuitTypeIdentifier;
module.exports.orderComparator = orderComparator;
module.exports.capitalize = capitalize;
module.exports.zip = zip;
