/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  GUEST = 'GUEST',
}

/**
 * Workflow types
 */
export enum WorkflowType {
  APPROVAL = 'APPROVAL',
  ONBOARDING = 'ONBOARDING',
  REVIEW = 'REVIEW',
  TASK = 'TASK',
  PROJECT = 'PROJECT',
  CUSTOM = 'CUSTOM',
}

/**
 * Workflow status
 */
export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

/**
 * Report types
 */
export enum ReportType {
  WORKFLOW_SUMMARY = 'WORKFLOW_SUMMARY',
  USER_ACTIVITY = 'USER_ACTIVITY',
  PERFORMANCE_METRICS = 'PERFORMANCE_METRICS',
  AUDIT_LOG = 'AUDIT_LOG',
  CUSTOM = 'CUSTOM',
}

/**
 * Report formats
 */
export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  HTML = 'HTML',
}

/**
 * Document types
 */
export enum DocumentType {
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  PROPOSAL = 'PROPOSAL',
  REPORT = 'REPORT',
  POLICY = 'POLICY',
  TEMPLATE = 'TEMPLATE',
}

/**
 * Document status
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Notification types
 */
export enum NotificationType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  ALERT = 'ALERT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Business metadata interface
 */
export interface BusinessMetadata {
  department?: string;
  team?: string;
  project?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  userRole: UserRole;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: BusinessMetadata;
}

/**
 * Business error interface
 */
export interface BusinessError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  correlationId?: string;
}
