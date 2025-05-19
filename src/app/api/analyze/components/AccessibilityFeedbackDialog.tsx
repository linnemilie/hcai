import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  BarChart,
  AlertTriangle,
  CheckCircle,
  Copy,
} from "lucide-react";

interface AccessibilityFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: {
    summary: string;
    issues: {
      severity: "high" | "medium" | "low";
      description: string;
    }[];
    recommendations: string[];
    passedItems: string[];
  } | null;
}

export function AccessibilityFeedbackDialog({
  open,
  onOpenChange,
  feedback,
}: AccessibilityFeedbackDialogProps) {
  // Make sure feedback is properly initialized
  console.log("Dialog received feedback:", feedback);
  console.log("Issues array:", feedback?.issues);
  const copyToClipboard = () => {
    if (!feedback) return;

    let text = `Accessibility Feedback Summary\n\n`;
    text += `${feedback.summary}\n\n`;

    if (
      feedback.issues &&
      Array.isArray(feedback.issues) &&
      feedback.issues.length > 0
    ) {
      text += `Issues:\n`;
      feedback.issues.forEach((issue) => {
        const description =
          typeof issue.description === "string"
            ? issue.description
            : JSON.stringify(issue.description);
        text += `• ${description}\n`;
      });
      text += `\n`;
    }

    if (
      feedback.recommendations &&
      Array.isArray(feedback.recommendations) &&
      feedback.recommendations.length > 0
    ) {
      text += `Recommendations:\n`;
      feedback.recommendations.forEach((rec) => {
        text += `• ${rec}\n`;
      });
      text += `\n`;
    }

    if (
      feedback.passedItems &&
      Array.isArray(feedback.passedItems) &&
      feedback.passedItems.length > 0
    ) {
      text += `What's Working Well:\n`;
      feedback.passedItems.forEach((item) => {
        text += `• ${item}\n`;
      });
    }

    navigator.clipboard.writeText(text);
  };

  if (!feedback) return null;

  // Make sure all required properties exist
  const summary = feedback.summary || "No summary provided";
  const issues = Array.isArray(feedback.issues) ? feedback.issues : [];
  const recommendations = Array.isArray(feedback.recommendations)
    ? feedback.recommendations
    : [];
  const passedItems = Array.isArray(feedback.passedItems)
    ? feedback.passedItems
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Accessibility Feedback
          </DialogTitle>
          <DialogDescription>
            Analysis of the current color contrasts and recommendations for
            improvement. Mark that colorblindness is not taken to account,
            please verify this with the colorblindness simulator.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Summary */}
          <div className="bg-slate-50 p-4 rounded-md">
            <h3 className="text-md font-medium mb-2">Summary</h3>
            <p className="text-sm text-slate-700">{summary}</p>
          </div>

          {/* Issues */}
          {feedback.issues && feedback.issues.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium">Issues to Address</h3>
              <div className="mt-2 space-y-3">
                {feedback.issues.map((issue, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center justify-center h-6 w-6 rounded-full mr-2 ${
                          issue.severity === "high"
                            ? "bg-red-100 text-red-800"
                            : issue.severity === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {issue.severity === "high"
                          ? "!"
                          : issue.severity === "medium"
                          ? "⚠"
                          : "i"}
                      </span>
                      <p className="text-sm">{issue.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium">Issues to Address</h3>
              <p className="mt-1 text-sm text-gray-500">
                No issues identified.
              </p>
            </div>
          )}

          {/* Rest of the component remains the same */}
          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="bg-slate-50 p-3 rounded-md text-sm">
                    {typeof rec === "string" ? rec : JSON.stringify(rec)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Passed Items */}
          {passedItems.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                What's Working Well
              </h3>
              <ul className="space-y-1">
                {passedItems.map((item, i) => (
                  <li key={i} className="bg-green-50 p-2 rounded-md text-sm">
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-4">
          <Button variant="outline" onClick={copyToClipboard} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy to Clipboard
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
