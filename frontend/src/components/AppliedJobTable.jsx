import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useSelector } from "react-redux";
import {
  Brain,
  Loader2,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Progress } from "../components/ui/Progress";
import { aiService } from "../services/ai.services";
import { toast } from "sonner";

const AppliedJobTable = () => {
  const { allAppliedJobs } = useSelector((store) => store.job);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loading, setLoading] = useState({});
  const [analysisData, setAnalysisData] = useState({});

  const handleAnalyze = async (applicationId) => {
    setLoading((prev) => ({ ...prev, [applicationId]: true }));
    try {
      const response = await aiService.analyzeApplication(applicationId);
      setAnalysisData((prev) => ({
        ...prev,
        [applicationId]: response.analysis,
      }));
      setSelectedAnalysis(applicationId);
      toast.success("Analysis completed!");
    } catch (error) {
      toast.error(error.message || "Analysis failed");
    } finally {
      setLoading((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleViewAnalysis = (applicationId) => {
    setSelectedAnalysis(applicationId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "rejected":
        return "bg-red-400";
      case "accepted":
        return "bg-green-400";
      case "shortlisted":
        return "bg-blue-400";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div>
      <Table>
        <TableCaption>A list of your applied jobs</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Job Role</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allAppliedJobs.length <= 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                You haven't applied any job yet.
              </TableCell>
            </TableRow>
          ) : (
            allAppliedJobs.map((appliedJob) => (
              <TableRow key={appliedJob._id}>
                <TableCell>{appliedJob?.createdAt?.split("T")[0]}</TableCell>
                <TableCell>{appliedJob.job?.title}</TableCell>
                <TableCell>{appliedJob.job?.company?.name}</TableCell>
                <TableCell className="text-center">
                  <Badge className={getStatusColor(appliedJob?.status)}>
                    {appliedJob.status?.toUpperCase() || "PENDING"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// Analysis Dialog Component
const AnalysisDialog = ({ analysis, jobTitle, companyName }) => {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-500" />
          AI Resume Analysis
          <span className="text-sm font-normal text-gray-500 ml-2">
            for {jobTitle} at {companyName}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Match Score */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Match Score</span>
            <span
              className={`text-lg font-bold ${
                analysis.matchPercentage >= 70
                  ? "text-green-600"
                  : analysis.matchPercentage >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {analysis.matchPercentage}%
            </span>
          </div>
          <Progress value={analysis.matchPercentage} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>

        {/* Strengths */}
        {analysis.strengths?.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-600 flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4" />
              Key Strengths
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.strengths.map((strength, idx) => (
                <Badge
                  key={idx}
                  className="bg-green-100 text-green-800 hover:bg-green-200"
                >
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {analysis.missingSkills?.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4" />
              Missing Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.missingSkills.map((skill, idx) => (
                <Badge key={idx} variant="destructive">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Feedback */}
        {analysis.feedback && (
          <div>
            <h4 className="font-semibold text-blue-600 flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              Detailed Feedback
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
              {analysis.feedback}
            </div>
          </div>
        )}

        {/* Suggested Improvements */}
        {analysis.improvements?.length > 0 && (
          <div>
            <h4 className="font-semibold text-purple-600 flex items-center gap-2 mb-2">
              🚀 Suggested Improvements
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              {analysis.improvements.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DialogContent>
  );
};

export default AppliedJobTable;
