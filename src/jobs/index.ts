import { startKeepAliveCron, stopKeepAliveCron } from "./ping.job";

export const startCronJobs = () => {
  startKeepAliveCron();
};

export const stopCronJobs = () => {
  stopKeepAliveCron();
};
