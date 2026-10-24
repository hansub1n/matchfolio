export type { DocumentKind, UserDocument } from "./model/types";
export { selectCoverLetter } from "./model/select-cover-letter";
export type { SaveDocumentInput } from "./api/documentApi";
export {
  getDocuments,
  createDocument,
  updateDocument,
  setPrimaryCoverLetter,
  deleteDocument,
} from "./api/documentApi";
