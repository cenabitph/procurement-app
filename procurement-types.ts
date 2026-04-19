// ============================================================
// Philippine Government Procurement System — RA 9184
// Revised IRR (2016) compliant data structures
// ============================================================

// ─── Users ──────────────────────────────────────────────────

export enum UserRole {
  Admin = "admin",
  Officer = "officer",
  Viewer = "viewer",
}

export interface UserT {
  id: string;
  username: string;
  passwordHash?: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Enums ──────────────────────────────────────────────────

export enum ProcurementMode {
  // Section 10 — competitive bidding
  CompetitiveBidding = "COMPETITIVE_BIDDING",

  // Section 48 — alternative methods
  LimitedSourceBidding = "LIMITED_SOURCE_BIDDING",
  DirectContracting = "DIRECT_CONTRACTING",
  RepeatOrder = "REPEAT_ORDER",
  Shopping = "SHOPPING",
  NegotiatedProcurement = "NEGOTIATED_PROCUREMENT",

  // Section 53 — negotiated subtypes
  TwoFailedBiddings = "NEGOTIATED_TWO_FAILED_BIDDINGS",
  EmergencyCase = "NEGOTIATED_EMERGENCY",
  SmallValue = "SMALL_VALUE_PROCUREMENT",
  AgencyToAgency = "AGENCY_TO_AGENCY",
  LeaseOfVenue = "LEASE_OF_VENUE",
  UNAC = "UN_AGENCIES",
}

export enum ProcurementCategory {
  Goods = "GOODS",
  Infrastructure = "INFRASTRUCTURE",
  ConsultingServices = "CONSULTING_SERVICES",
}

export enum ProjectStatus {
  Draft = "DRAFT",
  PPMPApproved = "PPMP_APPROVED",
  APPApproved = "APP_APPROVED",
  PreProcConference = "PRE_PROCUREMENT_CONFERENCE",
  AdvertisedPosted = "ADVERTISED_POSTED",
  EligibilityCheck = "ELIGIBILITY_CHECK",
  OpeningOfBids = "OPENING_OF_BIDS",
  BidEvaluation = "BID_EVALUATION",
  PostQualification = "POST_QUALIFICATION",
  BACResolution = "BAC_RESOLUTION",
  NoticeOfAward = "NOTICE_OF_AWARD",
  PerformanceBondPosted = "PERFORMANCE_BOND_POSTED",
  ContractSigned = "CONTRACT_SIGNED",
  NoticeToProceeed = "NOTICE_TO_PROCEED",
  Ongoing = "ONGOING",
  Completed = "COMPLETED",
  Terminated = "TERMINATED",
  Failed = "FAILED",
}

export enum SupplierType {
  Sole = "SOLE_PROPRIETORSHIP",
  Partnership = "PARTNERSHIP",
  Corporation = "CORPORATION",
  JointVenture = "JOINT_VENTURE",
  Cooperative = "COOPERATIVE",
}

export enum BidSecurityType {
  CashMO = "CASH_MONEY_ORDER",
  ManagersCheck = "MANAGERS_CHECK",
  BankDraft = "BANK_DRAFT",
  Guarantee = "GUARANTEE",
  SuretyBond = "SURETY_BOND",
  IrrevocableLC = "IRREVOCABLE_LETTER_OF_CREDIT",
}

export enum EvaluationMethod {
  LCRB = "LOWEST_CALCULATED_RESPONSIVE_BID",        // Goods & Infra
  HRRB = "HIGHEST_RATED_RESPONSIVE_BID",            // Consulting (QCBS/QBS)
  FBS = "FIXED_BUDGET_SELECTION",
  LCS = "LEAST_COST_SELECTION",
  CQS = "CONSULTANT_QUALIFICATION_SELECTION",
  SSS = "SINGLE_SOURCE_SELECTION",
}

export enum DVStatus {
  ForOBR = "FOR_OBR",
  ForCertification = "FOR_CERTIFICATION",
  ForApproval = "FOR_APPROVAL",
  Approved = "APPROVED",
  Processed = "PROCESSED",
  Released = "RELEASED",
}

export enum PPMPStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  Approved = "APPROVED",
  Revised = "REVISED",
}

export enum PhilGEPSPostingType {
  ITB = "INVITATION_TO_BID",
  RFQITP = "REQUEST_FOR_QUOTATION",
  NOA = "NOTICE_OF_AWARD",
  NTP = "NOTICE_TO_PROCEED",
  Contract = "CONTRACT",
  Supplemental = "SUPPLEMENTAL_BULLETIN",
}

// ─── Supporting Types ────────────────────────────────────────

export interface Address {
  street: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
  region: string;
  zipCode: string;
}

export interface FundSource {
  appropriationsAct: string;    // e.g. "GAA FY 2025"
  allotmentClass: "PS" | "MOOE" | "CO" | "FinEx";
  uacs: string;                 // Unified Accounts Code Structure
  obligationRequestNo?: string;
}

export interface ProcuringEntity {
  uacsCode: string;
  name: string;
  shortName: string;
  region: string;
  headOfProcuringEntity: string;
  bac: string;                  // BAC ID
}

// ─── PPMP & APP ──────────────────────────────────────────────

export interface PPMPItem {
  id: string;
  generalDescription: string;
  unitOfMeasure: string;
  quantity: number;
  estimatedUnitCost: number;
  totalABC: number;
  scheduledQuarter: 1 | 2 | 3 | 4;
  procurementMode: ProcurementMode;
  category: ProcurementCategory;
}

export interface PPMP {
  id: string;
  procuringEntityCode: string;
  fiscalYear: number;
  items: PPMPItem[];
  totalABC: number;
  preparedBy: string;
  certifiedBy: string;           // Budget Officer
  approvedBy: string;            // Head of Office
  status: PPMPStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface APPEntry {
  ppmpItemId: string;
  projectTitle: string;
  procurementMode: ProcurementMode;
  category: ProcurementCategory;
  abc: number;
  milestones: ProcurementMilestone[];
}

export interface ProcurementMilestone {
  activity: string;             // e.g. "Pre-Procurement Conference"
  plannedDate: Date;
  actualDate?: Date;
}

export interface APP {
  id: string;
  procuringEntityCode: string;
  fiscalYear: number;
  entries: APPEntry[];
  totalABC: number;
  approvedAt?: Date;
  revision: number;
}

// ─── Procurement Project ─────────────────────────────────────

export interface ProcurementProject {
  id: string;                   // PR reference number
  title: string;
  category: ProcurementCategory;
  procurementMode: ProcurementMode;
  status: ProjectStatus;
  abc: number;                  // Approved Budget for the Contract
  fundSource: FundSource;
  ppmpRef: string;
  appRef: string;
  procuringEntity: ProcuringEntity;
  bacId: string;
  milestones: ProcurementMilestone[];
  philGEPSRef?: string;
  isForeign: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── BAC ─────────────────────────────────────────────────────

export type BACRole =
  | "CHAIRPERSON"
  | "VICE_CHAIRPERSON"
  | "MEMBER"
  | "OBSERVER_COA"
  | "OBSERVER_CIVIL_SOCIETY"
  | "OBSERVER_PROFESSIONAL_ORG";

export interface BACMember {
  employeeId: string;
  name: string;
  designation: string;
  role: BACRole;
  appointedAt: Date;
  expiresAt?: Date;
}

export interface BACSecretariat {
  head: string;
  members: string[];
  officeUnit: string;
}

export interface TechnicalWorkingGroup {
  id: string;
  name: string;
  members: string[];
  formedAt: Date;
}

export interface BACResolution {
  id: string;
  resolutionNo: string;
  subject: string;
  recommendation:
    | "AWARD"
    | "FAILURE_OF_BIDDING"
    | "POST_DISQUALIFICATION"
    | "ALTERNATIVE_METHOD";
  resolvedAt: Date;
  votes: { memberId: string; vote: "YES" | "NO" | "ABSTAIN" }[];
  approvedByHOPE: boolean;
  approvedAt?: Date;
}

export interface BiddingAndAwardsCommittee {
  id: string;
  projectId: string;
  members: BACMember[];
  secretariat: BACSecretariat;
  twa: TechnicalWorkingGroup[];
  resolutions: BACResolution[];
  createdAt: Date;
}

// ─── Supplier / Bidder ───────────────────────────────────────

export interface ClassADocuments {
  // Legal eligibility
  dtiSecCdaReg: string;           // Registration cert
  mayorPermit: string;
  taxClearance: string;
  philGepsRegistration: string;
  auditedFinancials: Date;        // Year covered
  // Technical
  statementOfAllContracts: boolean;
  netFinancialContractingCapacity: number;
  // Others
  jvaAgreement?: string;          // For JVs
}

export interface ClassBDocuments {
  quotedBidPrice: number;
  bidSecurity: {
    type: BidSecurityType;
    amount: number;
    expiryDate: Date;
    issuerBank?: string;
  };
}

export interface PhilGEPSRegistration {
  registrationNo: string;
  certificateNo: string;
  validity: Date;
  platinumMember: boolean;
}

export interface Supplier {
  id: string;                     // PhilGEPS number
  businessName: string;
  tradeName?: string;
  type: SupplierType;
  address: Address;
  tin: string;
  philGepsReg: PhilGEPSRegistration;
  classA?: ClassADocuments;
  classB?: ClassBDocuments;
  vatRegistered: boolean;
  blacklisted: boolean;
  blacklistRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Bids ────────────────────────────────────────────────────

export interface TechnicalComponent {
  classADocs: ClassADocuments;
  technicalSpecs: Record<string, string>;
  organizationalChart?: boolean;
  keyPersonnel?: KeyPersonnel[];
  workPlan?: boolean;
}

export interface FinancialComponent {
  bidPriceForm: number;
  unitPrices: LineItem[];
  grandTotal: number;
}

export interface LineItem {
  itemNo: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface KeyPersonnel {
  name: string;
  role: string;
  license?: string;
  yearsExperience: number;
}

export interface BidDocument {
  id: string;
  projectId: string;
  supplierId: string;
  envelope1: TechnicalComponent;
  envelope2: FinancialComponent;
  bidSecurityType: BidSecurityType;
  bidSecurityAmount: number;
  bidSecurityExpiry: Date;
  submittedAt: Date;
  isLateFiling: boolean;
  isDisqualified: boolean;
  disqualificationReason?: string;
}

// ─── Bid Evaluation ──────────────────────────────────────────

export interface EvaluatedBid {
  supplierId: string;
  technicalScore?: number;       // For consulting (QCBS)
  financialBid: number;
  correctedBid?: number;         // After arithmetical correction
  isResponsive: boolean;
  postQualPassed?: boolean;
  postQualRemarks?: string;
  rank: number;
}

export interface BidEvaluation {
  id: string;
  projectId: string;
  method: EvaluationMethod;
  evaluatedBids: EvaluatedBid[];
  lcrbSupplierId: string;        // Lowest Calc. Responsive Bid winner
  postQualPassed: boolean;
  bacResolutionId: string;
  evaluatedAt: Date;
  remarks?: string;
}

// ─── Notice of Award & Contract ──────────────────────────────

export interface NoticeOfAward {
  id: string;
  projectId: string;
  supplierId: string;
  awardedAmount: number;
  postingDate: Date;
  acceptanceDeadline: Date;      // 7 calendar days per RA 9184
  acceptedAt?: Date;
  philGepsPosted: boolean;
  philGepsPostingRef?: string;
}

export interface NoticeToProceed {
  id: string;
  projectId: string;
  supplierId: string;
  contractAmount: number;
  contractRef: string;
  contractSigningDate: Date;
  ntpDate: Date;
  postingDate: Date;
  philGepsPosted: boolean;
  philGepsPostingRef?: string;
}

export interface Contract {
  id: string;
  projectId: string;
  supplierId: string;
  contractRef: string;
  amount: number;
  signingDate: Date;
  effectivityDate: Date;
  completionDate: Date;
  deliveryPeriod: number;         // Calendar days
  performanceBondAmount: number;
  performanceBondType: BidSecurityType;
}

export interface DisbursementVoucher {
  id: string;
  dvNo: string;
  projectId: string;
  supplierId: string;
  amount: number;
  particulars: string;
  fundSource: FundSource;
  status: DVStatus;
  certifiedBy: string;
  approvedBy: string;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhilGEPSPosting {
  id: string;
  projectId: string;
  postingType: PhilGEPSPostingType;
  referenceNo: string;
  postedAt: Date;
  expiresAt?: Date;
}
