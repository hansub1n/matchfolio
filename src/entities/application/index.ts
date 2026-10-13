export type { Application, ApplicationStatus, ApplicationResult } from "./model/types";
export { APPLICATION_STATUSES } from "./model/constants";
export type { CreateApplicationInput, UpdateApplicationInput } from "./api/applicationApi";
export {
  getApplications,
  createApplication,
  updateApplication,
} from "./api/applicationApi";
