export const getSuitNameFromSuitTypeIndentifier = (suitTypeIdentifier) => {
  return new RegExp("bid").test(suitTypeIdentifier)
    ? suitTypeIdentifier.slice(4).toLowerCase()
    : suitTypeIdentifier.slice(6).toLowerCase();
};

export const zip = (x, y) =>
  Array.from(Array(Math.max(x.length, y.length)), (_, i) => [x[i], y[i]]);

export const moveIndexInFront = (arr, index) => {
  if (index === null) return [];
  const movedValue = arr[index];
  arr = arr.filter((value, i) => i !== index);
  arr.unshift(movedValue);
  return arr;
};

export const capitalize = (str) => {
  return str[0].toUpperCase() + str.slice(1);
}