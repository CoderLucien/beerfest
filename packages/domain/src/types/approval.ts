export interface Approval {
  approvalId: string;
  campaignVersionId: string;
  campaignId: string;
  approver: string;
  decision: "approved" | "rejected";
  reason: string;
  createdAt: number;
}

export interface SubmitApprovalInput {
  campaignId: string;
  versionId: string;
}

export interface ApproveInput {
  campaignId: string;
  versionId: string;
  approver: string;
  reason: string;
}

export interface RejectInput {
  campaignId: string;
  versionId: string;
  approver: string;
  reason: string;
}
