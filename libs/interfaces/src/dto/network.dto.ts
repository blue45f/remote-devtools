export interface CreateNetworkDto {
  recordId: number;
  requestId: number;
  protocol?: object;
  timestamp: number;
}

export interface UpdateNetworkResponseBodyDto {
  recordId: number;
  requestId: number;
  body: string;
  base64Encoded: boolean;
}

export interface NetworkResponseDto {
  id: number;
  requestId: number;
  responseBody?: string;
  base64Encoded?: boolean;
  protocol?: object;
  timestamp: number;
}
