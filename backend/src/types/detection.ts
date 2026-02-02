export interface DetectionLabel {
  name: string;
  confidence: number;
}

export interface DetectionRecord {
  PK: string;
  SK: string;
  imageKey: string;
  captureDate: string;
  labels: DetectionLabel[];
  deerLabels: DetectionLabel[];
  confidence: number;
  isDeer: boolean;
  isVerified: boolean;
  createdAt: string;
  GSI1PK: string;
  GSI1SK: string;
}
