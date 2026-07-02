// Document endpoint response shapes

export interface UploadResponse {
  filename: string;
  chunks_added: number;
  status: string;
}

export interface DocumentsResponse {
  documents: string[];
}
