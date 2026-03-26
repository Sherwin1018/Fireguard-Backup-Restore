export const HUB_THRESHOLDS = {
  temperature: {
    warning: 40.0,
    alert: 50.0,
  },
  humidity: {
    warning: 80.0,
    alert: 100.0,
  },
  gas: {
    warning: 20,
    alert: 40,
  },
  co: {
    warning: 20,
    alert: 40,
  },
  flame: {
    threshold: 1,
  },
};

/*

example
 gas: {
   warning: 20,
   alert: 40,
 },
 co: {
   warning: 20,
   alert: 40,
 },

 That would behave like:

 <= 20 = normal
 > 20 and <= 40 = warning
 > 40 = alert
 
 */