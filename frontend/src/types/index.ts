export type BuildStatus = 'SUCCESS' | 'FAILURE';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AiStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'NOT_REQUIRED';

export interface AiAnalysis {
  error_identification: string;
  root_cause: string;
  recommended_solutions: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface Deployment {
  id: string;
  repoName: string;
  commitHash: string;
  buildHash: string | null;
  buildStatus: BuildStatus;
  processingStatus: ProcessingStatus;
  txSignature: string | null;
  explorerUrl: string | null;
  aiStatus: AiStatus | null;
  aiAnalysis: AiAnalysis | null;
  workflowRunId: string;
  runAttempt: number;
  workflowUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Stats {
  totalDeployments: number;
  successfulBuilds: number;
  failedBuilds: number;
  failureRate: number;
  verifiedTransactions: number;
}

export interface Health {
  status: string;
  backend: string;
  database: string;
  solanaRpc: string;
  solanaNetwork: string;
  walletAddress: string;
  aiProvider: string;
}

export type VerifyStatus = 'VERIFIED' | 'NOT_FOUND' | 'VERIFICATION_FAILED' | 'VERIFICATION_UNAVAILABLE';

export interface VerifyResponse {
  verified: boolean;
  status: VerifyStatus;
  message?: string;
  explorerUrl?: string;
  data?: {
    repo: string;
    commit: string;
    buildHash: string;
    network: string;
    txSignature: string;
    explorerUrl: string;
  };
}
