// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  level: 1 | 2 | 3 | 4; // Level 4 is admin
  schoolName?: string;
  principalId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Form Types
export interface FormData {
  _id?: string;
  userId: string;
  schoolName: string;
  principalEmail: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  currentStep: number;
  completedSteps: number[];
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewComments?: string;
  
  // Screen 1: Table of Contents
  tableOfContents: {
    completed: boolean;
    notes?: string;
  };
  
  // Screen 2: Principal Letter
  //principalLetter: {
  //  completed: boolean;
  //  letterContent?: string;
  //  attachments?: string[];
  //};
  
  // Screen 2: Child Abuse and Neglect Intervention
  childAbuseIntervention: {
    completed: boolean;
    designatedLiaison: string;
    teamMembers: string[];
    trainingCompleted: boolean;
    parentalInvolvement: string;
    studentEducation: string;
    localAgencySupports: string[];
  };
  
  // Screen 3: Student to Student Sexual Harassment
  sexualHarassment: {
    completed: boolean;
    designatedLiaison: string;
    trainingCompleted: boolean;
    protocols: string;
  };
  
  // Screen 4: Respect For All Plan
  respectForAll: {
    completed: boolean;
    liaisons: string[];
    preventionPlan: string;
    postersDisplayed: boolean;
    posterLocations?: string[];
  };
  
  // Screen 5: Suicide Prevention and Crisis Intervention
  suicidePrevention: {
    completed: boolean;
    crisisTeamChair: string;
    suicidePreventionLiaison: string;
    teamMembers: string[];
    crisisTraining: string;
    suicideProtocols: string;
    deescalationPlan: string;
    staffTrainedConflictResolution: boolean;
    conflictResolutionTechniques: string;
  };
  
  // Screen 6: School Attendance Plan
  attendancePlan: {
    completed: boolean;
    attendanceCoordinator: string;
    priorYearPercentage: number;
    attendanceGoals: string[];
    dataCollection: string;
    highSchoolSection?: string;
    targetInterventions: string;
    form407Alerts: string;
    rolesResponsibilities: string;
  };
  
  // Screen 7: Students in Temporary Housing
  temporaryHousing: {
    completed: boolean;
    atsLiaison: string;
    updateProtocols: string;
    postersDisplayed: boolean;
    schoolBasedLiaison: string;
    sthServices: string[];
  };
  
  // Screen 8: Service In Schools Plan
  serviceInSchools: {
    completed: boolean;
    serviceCoordinator: string;
    communityServices: string[];
    partnerOrganizations: string[];
  };
  
  // Screen 9: Planning Interviews
  planningInterviews: {
    completed: boolean;
    interviewers: string[];
    iepInterviewers?: string[];
    outreachProtocols: string;
    dischargeProtocols: string;
  };
  
  // Screen 10: Military Recruitment Opt-Out
  militaryRecruitment: {
    completed: boolean;
    liaison: string;
    visitationPlan: string;
    parentOutreachPlan: string;
  };
  
  // Screen 11: School Culture Plan
  schoolCulture: {
    completed: boolean;
    cultureForum: string[];
    socialEmotionalGrowthPlan: string;
    interventionStrategy: string;
  };
  
  // Screen 12: After School Programs
  afterSchoolPrograms: {
    completed: boolean;
    programs: Array<{
      name: string;
      description: string;
      coordinator: string;
      schedule: string;
    }>;
  };
  
  // Screen 13: Cell Phone Policy
  cellPhonePolicy: {
    completed: boolean;
    policy: string;
    notification: string;
    orientation: string;
  };
  
  // Screen 14: School Counseling Plan
  counselingPlan: {
    completed: boolean;
    coordinator: string;
    missionStatement: string;
    programMap: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation Types
export interface StepNavigation {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  canGoBack: boolean;
}

// Admin Dashboard Types
export interface FormSubmission extends FormData {
  principalName: string;
  submissionDate: Date;
  reviewStatus: 'pending' | 'in_review' | 'completed';
}

export type {
  ContactRecord,
  ContactTable,
  ContactColumnDef,
} from '../lib/contactTextParser';