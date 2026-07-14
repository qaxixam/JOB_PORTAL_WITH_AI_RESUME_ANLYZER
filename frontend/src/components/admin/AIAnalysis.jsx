import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Loader2,
  TrendingUp,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { aiService } from "../../services/ai.services";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentAnalysis } from "@/redux/applicationSlice";

const AIAnalysis = () => {
  const { applicationId } = useParams();
  const dispatch = useDispatch();
  const analysis = useSelector((state) => state.application.currentAnalysis);
  const [loading, setLoading] = useState(false);
  

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await aiService.analyzeApplication(applicationId);
      dispatch(setCurrentAnalysis(response?.data?.analysis));
      console.log("application response in ai analyzer", response.data);
      toast.success("Analysis completed!");
    } catch (error) {
      toast.error(error.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely get match score
  const getMatchScore = () => {
    if (!analysis) return 0;
    // Try multiple possible field names from your API response
    const score =
      analysis.matchPercentage ?? analysis.match_score ?? analysis.score ?? 0;
    return Math.min(100, Math.max(0, Number(score) || 0));
  };

  const matchScore = getMatchScore();

  // Color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getBarColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Analyzing resume...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">AI Resume Analysis</h2>

      <div className="flex gap-4">
        <Button onClick={handleAnalyze} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          Analyze This Application
        </Button>
      </div>

      {analysis && (
        <div className="space-y-6">
          {/* Match Score - FIXED */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Match Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Big percentage display */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">
                    Overall Match
                  </span>
                  <span
                    className={`text-3xl font-bold ${getScoreColor(matchScore)}`}
                  >
                    {matchScore}%
                  </span>
                </div>

                {/* Custom Progress Bar */}
                <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(matchScore)}`}
                    style={{ width: `${matchScore}%` }}
                  />
                </div>

                {/* Score labels */}
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.strengths.map((strength, index) => (
                    <Badge
                      key={index}
                      className="bg-green-100 text-green-800 hover:bg-green-200"
                    >
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Missing Skills */}
          {analysis.missingSkills?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Missing Skills/Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingSkills.map((skill, index) => (
                    <Badge key={index} variant="destructive">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Feedback */}
          {analysis.feedback && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {analysis.feedback}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested Improvements */}
          {analysis.improvements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Improvements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.improvements.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-gray-700"
                    >
                      <span className="mt-1.5 w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
