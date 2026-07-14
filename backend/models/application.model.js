import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    aiAnalysis: {
        matchPercentage: Number,
        strengths: [String],
        missingSkills: [String],
        feedback: String,
        improvements: [String],
        rawResponse: String
    },

    analysisDate: Date,
    status: {
        type: String,
        enum: ['pending', 'shortlisted', 'rejected', 'analyzed'],
        default: 'pending'
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });
export const Application = mongoose.model("Application", applicationSchema);