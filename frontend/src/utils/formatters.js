export const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString();
};

export const formatRating = (rating) => {
  if (rating === undefined || rating === null || isNaN(rating)) return '0.0';
  return rating.toFixed(1);
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  return `$${amount.toFixed(2)}`;
};