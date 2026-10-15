import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

// ========== Job Requisition ==========
export const createRequisition = async (workforceRequestId: number, requestedBy: number) => {
  const wfReq = await prisma.workforceRequest.findUnique({ where: { id: workforceRequestId } });
  if (!wfReq) throw new AppError('Workforce Request not found', 404);
  if (wfReq.status !== 'APPROVED') throw new AppError('Only APPROVED workforce requests can generate a job requisition', 400);

  const existingReq = await prisma.jobRequisition.findUnique({ where: { workforceRequestId } });
  if (existingReq) throw new AppError('A Job Requisition already exists for this Workforce Request', 409);

  return await prisma.jobRequisition.create({
    data: {
      workforceRequestId,
      requestedBy,
      status: 'DRAFT',
    },
    include: {
      workforceRequest: {
        include: {
          department: true,
          position: true,
          requester: { select: { id: true, email: true } },
        },
      },
      requester: { select: { id: true, email: true } },
      jobPosting: true,
    },
  });
};

export const getRequisitionById = async (id: number) => {
  const req = await prisma.jobRequisition.findUnique({
    where: { id },
    include: {
      workforceRequest: {
        include: {
          department: true,
          position: true,
          requester: { select: { id: true, email: true } },
        },
      },
      requester: { select: { id: true, email: true } },
      jobPosting: true,
    },
  });
  if (!req) throw new AppError('Job Requisition not found', 404);
  return req;
};

export const listRequisitions = async (page: number, limit: number, status?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.JobRequisitionWhereInput = status ? { status: status as any } : {};

  const [total, requisitions] = await Promise.all([
    prisma.jobRequisition.count({ where }),
    prisma.jobRequisition.findMany({
      where,
      skip,
      take: limit,
      include: {
        workforceRequest: {
          include: {
            department: true,
            position: true,
            requester: { select: { id: true, email: true } },
          },
        },
        requester: { select: { id: true, email: true } },
        jobPosting: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { total, requisitions };
};

export const updateRequisitionStatus = async (id: number, status: string) => {
  const req = await prisma.jobRequisition.findUnique({ where: { id } });
  if (!req) throw new AppError('Job Requisition not found', 404);
  return await prisma.jobRequisition.update({
    where: { id },
    data: { status: status as any },
    include: {
      workforceRequest: {
        include: {
          department: true,
          position: true,
        },
      },
      jobPosting: true,
    },
  });
};

// ========== Job Posting ==========
export const createJobPosting = async (data: any) => {
  const req = await prisma.jobRequisition.findUnique({ where: { id: data.requisitionId } });
  if (!req) throw new AppError('Job Requisition not found', 404);
  if (req.status !== 'APPROVED') throw new AppError('Job Requisition must be APPROVED to create a posting', 400);

  const existing = await prisma.jobPosting.findUnique({ where: { requisitionId: data.requisitionId } });
  if (existing) throw new AppError('A Job Posting already exists for this requisition', 409);

  return await prisma.jobPosting.create({
    data: { ...data, status: 'DRAFT' },
    include: {
      requisition: {
        include: {
          workforceRequest: {
            include: { position: true, department: true },
          },
        },
      },
    },
  });
};

export const updateJobPosting = async (id: number, data: any) => {
  const posting = await prisma.jobPosting.findUnique({ where: { id } });
  if (!posting) throw new AppError('Job Posting not found', 404);
  return await prisma.jobPosting.update({
    where: { id },
    data,
    include: {
      requisition: {
        include: {
          workforceRequest: {
            include: { position: true, department: true },
          },
        },
      },
    },
  });
};

export const listJobPostings = async (page: number, limit: number, status?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.JobPostingWhereInput = status ? { status: status as any } : {};
  const [total, postings] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({
      where,
      skip,
      take: limit,
      include: {
        requisition: {
          include: {
            workforceRequest: {
              include: { position: true, department: true },
            },
          },
        },
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { total, postings };
};

export const getJobPostingById = async (id: number) => {
  const posting = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      requisition: {
        include: {
          workforceRequest: {
            include: { position: true, department: true },
          },
        },
      },
      applications: {
        include: {
          candidate: true,
          interviews: { include: { evaluation: true } },
        },
      },
    },
  });
  if (!posting) throw new AppError('Job Posting not found', 404);
  return posting;
};

// ========== Candidate Profiles ==========
export const createCandidate = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  source?: string | null;
}) => {
  const existing = await prisma.candidate.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Candidate with this email already exists', 409);
  }
  return await prisma.candidate.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      resumeUrl: data.resumeUrl || null,
      source: data.source || null,
    },
  });
};

export const listCandidates = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.CandidateWhereInput = search
    ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, candidates] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      include: {
        applications: {
          include: {
            jobPosting: true,
            interviews: { include: { evaluation: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { total, candidates };
};

export const getCandidateById = async (id: number) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      applications: {
        include: {
          jobPosting: true,
          interviews: {
            include: {
              interviewer: { select: { id: true, email: true } },
              evaluation: true,
            },
          },
          statusHistory: {
            include: { changedBy: { select: { id: true, email: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!candidate) throw new AppError('Candidate not found', 404);
  return candidate;
};

// ========== Candidate & Application ==========
export const createApplication = async (data: any) => {
  const posting = await prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } });
  if (!posting) throw new AppError('Job Posting not found', 404);
  if (posting.status !== 'PUBLISHED') throw new AppError('Cannot apply to an unpublished job posting', 400);

  let candidate;
  if (data.candidateId) {
    candidate = await prisma.candidate.findUnique({ where: { id: data.candidateId } });
    if (!candidate) throw new AppError('Candidate not found', 404);
  } else if (data.email) {
    candidate = await prisma.candidate.findUnique({ where: { email: data.email } });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          resumeUrl: data.resumeUrl || null,
          source: data.source || null,
        },
      });
    }
  } else {
    throw new AppError('Candidate details or ID required', 400);
  }

  const existingApp = await prisma.application.findUnique({
    where: { candidateId_jobPostingId: { candidateId: candidate.id, jobPostingId: data.jobPostingId } },
  });
  if (existingApp) throw new AppError('Candidate has already applied for this job posting', 409);

  const application = await prisma.application.create({
    data: {
      candidateId: candidate.id,
      jobPostingId: data.jobPostingId,
      status: 'APPLIED',
      statusHistory: {
        create: { status: 'APPLIED', notes: 'Initial application' },
      },
    },
    include: {
      candidate: true,
      jobPosting: true,
    },
  });

  return application;
};

export const listApplications = async (
  page: number,
  limit: number,
  filters: {
    jobPostingId?: number;
    candidateId?: number;
    status?: string;
    search?: string;
  }
) => {
  const skip = (page - 1) * limit;
  const where: Prisma.ApplicationWhereInput = {};
  if (filters.jobPostingId) where.jobPostingId = filters.jobPostingId;
  if (filters.candidateId) where.candidateId = filters.candidateId;
  if (filters.status) where.status = filters.status as any;
  if (filters.search) {
    where.OR = [
      { candidate: { firstName: { contains: filters.search, mode: 'insensitive' } } },
      { candidate: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      { candidate: { email: { contains: filters.search, mode: 'insensitive' } } },
      { jobPosting: { title: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      skip,
      take: limit,
      include: {
        candidate: true,
        jobPosting: {
          include: {
            requisition: {
              include: {
                workforceRequest: {
                  include: { position: true, department: true },
                },
              },
            },
          },
        },
        interviews: {
          include: {
            interviewer: { select: { id: true, email: true } },
            evaluation: true,
          },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return { total, applications };
};

export const getApplicationById = async (id: number) => {
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: true,
      jobPosting: {
        include: {
          requisition: {
            include: {
              workforceRequest: {
                include: { position: true, department: true },
              },
            },
          },
        },
      },
      interviews: {
        include: {
          interviewer: { select: { id: true, email: true } },
          evaluation: true,
        },
        orderBy: { scheduledAt: 'desc' },
      },
      statusHistory: {
        include: { changedBy: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!app) throw new AppError('Application not found', 404);
  return app;
};

export const updateApplicationStatus = async (id: number, status: string, changedById: number, notes?: string) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new AppError('Application not found', 404);

  // Status transitions
  const validTransitions: Record<string, string[]> = {
    'APPLIED': ['SCREENING', 'REJECTED', 'WITHDRAWN'],
    'SCREENING': ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
    'SHORTLISTED': ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
    'INTERVIEW': ['SELECTED', 'REJECTED', 'WITHDRAWN'],
    'SELECTED': ['PENDING_HEAD_OF_HR_APPROVAL', 'REJECTED', 'WITHDRAWN'],
    'PENDING_HEAD_OF_HR_APPROVAL': ['APPROVED', 'REJECTED', 'WITHDRAWN'],
    'APPROVED': ['HIRED', 'WITHDRAWN'],
  };

  const allowed = validTransitions[app.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid status transition from ${app.status} to ${status}`, 400);
  }

  return await prisma.application.update({
    where: { id },
    data: {
      status: status as any,
      statusHistory: {
        create: { status: status as any, changedById, notes },
      },
    },
    include: {
      candidate: true,
      jobPosting: true,
    },
  });
};

// ========== Interview ==========
export const createInterview = async (data: any) => {
  const app = await prisma.application.findUnique({ where: { id: data.applicationId } });
  if (!app) throw new AppError('Application not found', 404);
  
  if (app.status !== 'SHORTLISTED' && app.status !== 'INTERVIEW') {
    throw new AppError('Application must be in SHORTLISTED or INTERVIEW status to schedule an interview', 400);
  }

  const scheduledDate = new Date(data.scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new AppError('Invalid interview scheduled date', 400);
  }

  // Conflict detection: Check if interviewer is already booked within 30 minutes
  const thirtyMins = 30 * 60 * 1000;
  const conflict = await prisma.interview.findFirst({
    where: {
      interviewerId: data.interviewerId,
      status: 'SCHEDULED',
      scheduledAt: {
        gte: new Date(scheduledDate.getTime() - thirtyMins),
        lte: new Date(scheduledDate.getTime() + thirtyMins),
      },
    },
  });

  if (conflict) {
    throw new AppError('Interviewer has a scheduling conflict with another interview at this time', 409);
  }

  if (app.status === 'SHORTLISTED') {
    await updateApplicationStatus(app.id, 'INTERVIEW', data.interviewerId, 'Auto-transitioned due to interview scheduling');
  }

  return await prisma.interview.create({
    data,
    include: {
      application: {
        include: {
          candidate: true,
          jobPosting: true,
        },
      },
      interviewer: { select: { id: true, email: true } },
    },
  });
};

export const listInterviews = async (
  page: number,
  limit: number,
  filters: {
    applicationId?: number;
    interviewerId?: number;
    status?: string;
  }
) => {
  const skip = (page - 1) * limit;
  const where: Prisma.InterviewWhereInput = {};
  if (filters.applicationId) where.applicationId = filters.applicationId;
  if (filters.interviewerId) where.interviewerId = filters.interviewerId;
  if (filters.status) where.status = filters.status as any;

  const [total, interviews] = await Promise.all([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      skip,
      take: limit,
      include: {
        application: {
          include: {
            candidate: true,
            jobPosting: true,
          },
        },
        interviewer: { select: { id: true, email: true } },
        evaluation: true,
      },
      orderBy: { scheduledAt: 'asc' },
    }),
  ]);

  return { total, interviews };
};

export const getInterviewById = async (id: number) => {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          candidate: true,
          jobPosting: true,
        },
      },
      interviewer: { select: { id: true, email: true } },
      evaluation: true,
    },
  });
  if (!interview) throw new AppError('Interview not found', 404);
  return interview;
};

export const updateInterview = async (id: number, data: any) => {
  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) throw new AppError('Interview not found', 404);

  if (data.scheduledAt && data.interviewerId) {
    const scheduledDate = new Date(data.scheduledAt);
    const thirtyMins = 30 * 60 * 1000;
    const conflict = await prisma.interview.findFirst({
      where: {
        id: { not: id },
        interviewerId: data.interviewerId,
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(scheduledDate.getTime() - thirtyMins),
          lte: new Date(scheduledDate.getTime() + thirtyMins),
        },
      },
    });
    if (conflict) {
      throw new AppError('Interviewer has a scheduling conflict with another interview at this time', 409);
    }
  }

  return await prisma.interview.update({
    where: { id },
    data,
    include: {
      application: {
        include: {
          candidate: true,
          jobPosting: true,
        },
      },
      interviewer: { select: { id: true, email: true } },
      evaluation: true,
    },
  });
};

export const submitInterviewEvaluation = async (id: number, data: any) => {
  const interview = await prisma.interview.findUnique({ where: { id }, include: { evaluation: true } });
  if (!interview) throw new AppError('Interview not found', 404);
  if (interview.evaluation) throw new AppError('Interview evaluation already submitted', 409);

  if (interview.status !== 'COMPLETED') {
    await prisma.interview.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  return await prisma.interviewEvaluation.create({
    data: { ...data, interviewId: id },
  });
};
