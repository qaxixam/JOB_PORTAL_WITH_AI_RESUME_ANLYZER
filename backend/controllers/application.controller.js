import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { analyzeResume } from "../services/ai.service.js";
import { extractTextFromFile } from "../services/file.service.js";
import getDataUri from "../utils/datauri.js";

export const applyJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;
        if (!jobId) {
            return res.status(400).json({
                message: "Job id is required.",
                success: false
            })
        };
        // check if the user has already applied for the job
        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });

        if (existingApplication) {
            return res.status(400).json({
                message: "You have already applied for this jobs",
                success: false
            });
        }

        // check if the jobs exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            })
        }


        const user = await User.findById(userId);
        // create a new application
        const newApplication = await Application.create({
            job: jobId,
            applicant: userId,


        });

        job.applications.push(newApplication._id);
        await job.save();
        return res.status(201).json({
            message: "Job applied successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
};
export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const application = await Application.find({ applicant: userId }).sort({ createdAt: -1 }).populate({
            path: 'job',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'company',
                options: { sort: { createdAt: -1 } },
            }
        });
        if (!application) {
            return res.status(404).json({
                message: "No Applications",
                success: false
            })
        };
        return res.status(200).json({
            application,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
// admin dekhega kitna user ne apply kiya hai
export const getApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path: 'applications',
            options: { sort: { createdAt: -1 } },
            populate: {
                path: 'applicant'
            }
        });
        if (!job) {
            return res.status(404).json({
                message: 'Job not found.',
                success: false
            })
        };
        return res.status(200).json({
            job,
            succees: true
        });
    } catch (error) {
        console.log(error);
    }
}
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const applicationId = req.params.id;
        if (!status) {
            return res.status(400).json({
                message: 'status is required',
                success: false
            })
        };

        // find the application by applicantion id
        const application = await Application.findOne({ _id: applicationId });
        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
                success: false
            })
        };

        // update the status
        application.status = status.toLowerCase();
        await application.save();

        return res.status(200).json({
            message: "Status updated successfully.",
            success: true
        });

    } catch (error) {
        console.log(error);
    }
}



// Add new endpoint
export const analyzeApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // ✅ Validate applicationId
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "Application ID is required"
            });
        }

        // Find application with populated references
        const application = await Application.findById(applicationId)
            .populate("job")
            .populate("applicant");

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        // ✅ CRITICAL FIX: Check if resume exists before processing
        if (!application.applicant?.profile?.resume) {
            return res.status(400).json({
                success: false,
                message: "Applicant has not uploaded a resume yet. Please ask them to upload one.",
                applicationId: applicationId
            });
        }

        if (!application.job?.description) {
            return res.status(400).json({
                success: false,
                message: "Job description is missing",
                applicationId: applicationId
            });
        }



        let resumeText = "";

        try {
            // Extract text from applicant's resume
            resumeText = await extractTextFromFile(
                application.applicant.profile.resume
            );



            if (!resumeText || resumeText.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Could not extract text from resume. The file might be corrupted or invalid.",
                    applicationId: applicationId
                });
            }



        } catch (extractError) {
            console.error("❌ Resume extraction failed:", extractError.message);
            return res.status(400).json({
                success: false,
                message: "Failed to extract resume text. Please ensure the resume is in a valid format (PDF/DOCX).",
                error: extractError.message,
                applicationId: applicationId
            });
        }

        try {
            // Analyze resume against job description
            const analysis = await analyzeResume(
                resumeText,
                application.job.description
            );



            // Save analysis to application
            application.aiAnalysis = analysis;
            application.analysisDate = new Date();
            application.analysisStatus = "completed";

            await application.save();

            console.log("✅ Analysis completed successfully");
            console.log("Analysis", analysis);

            return res.status(200).json({
                success: true,
                message: "Application analyzed successfully",
                data: {
                    applicationId: application._id,
                    analysis: analysis,
                    analysisDate: application.analysisDate
                }
            });

        } catch (analysisError) {
            console.error("❌ AI Analysis failed:", analysisError.message);

            // Save failed analysis state
            application.analysisStatus = "failed";
            await application.save();

            return res.status(500).json({
                success: false,
                message: "AI analysis failed. Please try again later.",
                error: analysisError.message,
                applicationId: applicationId
            });
        }

    } catch (error) {
        console.error("❌ Unexpected error in analyzeApplication:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while analyzing the application.",
            error: error.message
        });
    }
};

/**
 * HELPER: Get analysis for application (already analyzed)
 */
export const getApplicationAnalysis = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await Application.findById(applicationId)
            .populate("job")
            .populate("applicant");

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        if (!application.aiAnalysis) {
            return res.status(400).json({
                success: false,
                message: "This application has not been analyzed yet",
                analysisStatus: application.analysisStatus || "pending"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                applicationId: application._id,
                analysis: application.aiAnalysis,
                analysisDate: application.analysisDate,
                analysisStatus: application.analysisStatus
            }
        });

    } catch (error) {
        console.error("Error fetching analysis:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch analysis",
            error: error.message
        });
    }
};


