export type SecurityVerdict = 'green' | 'yellow' | 'orange' | 'red';
export type ReceiptRoute = 'admit' | 'remediate' | 'escalate' | 'incident';

export type SecurityFinding = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  location?: string;
  summary?: string;
};

export type SecurityReceiptInput = {
  receiptId: string;
  receiptDigest: string;
  artifactDigest: string;
  sourceCommit?: string;
  policyVersion: string;
  verdict: string;
  riskScore: number;
  findings: SecurityFinding[];
};

export type ReceiptRouteDecision = {
  decisionId: string;
  workflowId: string;
  receiptId: string;
  receiptDigest: string;
  policyVersion: string;
  normalizedVerdict: SecurityVerdict | 'unknown';
  route: ReceiptRoute;
  executionAllowed: boolean;
  humanApprovalRequired: boolean;
  minimumQuorumSeats: number;
  specialistSeats: string[];
  actions: string[];
  reentryRequirements: string[];
  reason: string;
};

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{7,64}$/;

function normalizeVerdict(verdict: string): SecurityVerdict | 'unknown' {
  const normalized = verdict.trim().toLowerCase();
  if (
    normalized === 'green' ||
    normalized === 'yellow' ||
    normalized === 'orange' ||
    normalized === 'red'
  ) {
    return normalized;
  }
  return 'unknown';
}

function selectSpecialistSeats(findings: SecurityFinding[]): string[] {
  const seats = new Set<string>(['security']);

  for (const finding of findings) {
    const domain = finding.rule.split('.')[0]?.toLowerCase();
    if (domain === 'ci' || domain === 'dependency') {
      seats.add('supply-chain');
    } else if (domain === 'container') {
      seats.add('container-security');
    } else if (domain === 'credential') {
      seats.add('secrets-and-identity');
    } else if (domain === 'network') {
      seats.add('network-security');
    } else if (domain === 'integrity' || domain === 'provenance') {
      seats.add('provenance');
    } else if (domain) {
      seats.add(domain);
    }
  }

  return [...seats].sort();
}

function workflowIdFor(input: SecurityReceiptInput): string {
  const digest = input.receiptDigest.replace('sha256:', '');
  const policy = input.policyVersion.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `receipt-route-${digest}-${policy}`;
}

function invalidReceiptReason(input: SecurityReceiptInput): string | undefined {
  if (!input.receiptId.trim()) return 'receipt_id_missing';
  if (!SHA256_PATTERN.test(input.receiptDigest)) {
    return 'receipt_digest_invalid';
  }
  if (!SHA256_PATTERN.test(input.artifactDigest)) {
    return 'artifact_digest_invalid';
  }
  if (input.sourceCommit && !COMMIT_PATTERN.test(input.sourceCommit)) {
    return 'source_commit_invalid';
  }
  if (!input.policyVersion.trim()) return 'policy_version_missing';
  if (
    !Number.isFinite(input.riskScore) ||
    input.riskScore < 0 ||
    input.riskScore > 100
  ) {
    return 'risk_score_invalid';
  }
  if (!Array.isArray(input.findings)) return 'findings_invalid';
  return undefined;
}

export async function routeSecurityReceipt(
  input: SecurityReceiptInput
): Promise<ReceiptRouteDecision> {
  const invalidReason = invalidReceiptReason(input);
  const normalizedVerdict = invalidReason
    ? 'unknown'
    : normalizeVerdict(input.verdict);
  const base = {
    decisionId: `${input.receiptDigest}:${input.policyVersion}`,
    workflowId: workflowIdFor(input),
    receiptId: input.receiptId,
    receiptDigest: input.receiptDigest,
    policyVersion: input.policyVersion,
    normalizedVerdict,
    specialistSeats: selectSpecialistSeats(input.findings ?? []),
  };
  const reentryRequirements = [
    'new_artifact_digest',
    'new_green_security_receipt',
    'required_reviews_complete',
    'fresh_scoped_access',
    'blocked_receipt_preserved_as_lineage',
  ];

  if (normalizedVerdict === 'green') {
    return {
      ...base,
      route: 'admit',
      executionAllowed: true,
      humanApprovalRequired: false,
      minimumQuorumSeats: 1,
      actions: ['record_admission', 'continue_assignment'],
      reentryRequirements: [],
      reason: 'exact_artifact_admitted_by_green_receipt',
    };
  }

  if (normalizedVerdict === 'yellow') {
    const hasHighSeverity = input.findings.some(
      ({ severity }) => severity === 'critical' || severity === 'high'
    );
    return {
      ...base,
      route: 'remediate',
      executionAllowed: false,
      humanApprovalRequired: false,
      minimumQuorumSeats: hasHighSeverity ? 11 : 7,
      actions: [
        'block_execution',
        'quarantine_artifact',
        'open_remediation',
        'expand_specialist_quorum',
        'rescan_replacement',
      ],
      reentryRequirements,
      reason: 'yellow_receipt_requires_remediation',
    };
  }

  if (normalizedVerdict === 'orange') {
    return {
      ...base,
      route: 'escalate',
      executionAllowed: false,
      humanApprovalRequired: true,
      minimumQuorumSeats: 15,
      actions: [
        'block_execution',
        'quarantine_artifact',
        'preserve_evidence',
        'open_high_risk_review',
        'expand_specialist_quorum',
        'generate_review_proof_drop',
        'notify_operator',
        'rescan_replacement',
      ],
      reentryRequirements,
      reason: 'orange_receipt_requires_human_led_escalation',
    };
  }

  const hasCriticalFinding = input.findings?.some(
    ({ severity }) => severity === 'critical'
  );
  return {
    ...base,
    route: 'incident',
    executionAllowed: false,
    humanApprovalRequired: true,
    minimumQuorumSeats: hasCriticalFinding ? 21 : 15,
    actions: [
      'abort_assignment',
      'isolate_artifact_and_derivatives',
      'revoke_temporary_access',
      'preserve_evidence',
      'generate_incident_proof_drop',
      'notify_operator_and_security',
      'trace_downstream_lineage',
      'require_human_reentry',
    ],
    reentryRequirements,
    reason: invalidReason ?? 'red_or_unknown_receipt_requires_incident_route',
  };
}

export function receiptRouteWorkflowId(input: SecurityReceiptInput): string {
  return workflowIdFor(input);
}
