export const validateRegistrationNumber = (regNumber: string): boolean => {
  const pattern = /^RA\d+$/;
  return pattern.test(regNumber);
};

export const computeGroup = (section: string, batch: string): string => {
  const batchNum = batch.split(' ').pop();
  return `${section}${batchNum}`;
};

export const validateEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};
