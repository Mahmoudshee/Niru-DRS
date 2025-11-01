import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, CheckCircle, XCircle, AlertTriangle, Info, Sparkles } from "lucide-react";
import { Requisition } from "@/types/requisition";

interface ApprovalAssistantProps {
  requisition: Requisition;
  onSuggestion?: (suggestion: string) => void;
}

const ApprovalAssistant: React.FC<ApprovalAssistantProps> = ({ requisition, onSuggestion }) => {
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAiResponse(null);

    // Build requisition summary for AI analysis
    const itemsSummary = requisition.items.map(item => 
      `- ${item.description} (Qty: ${item.quantity}, Unit: KES ${item.unitPrice.toLocaleString()}, Total: KES ${item.totalPrice.toLocaleString()})`
    ).join('\n');

    const requisitionSummary = `
Requisition Details:
- ID: ${requisition.id}
- Activity: ${requisition.activity}
- Staff: ${requisition.staffName} (${requisition.staffEmail})
- Date: ${new Date(requisition.date).toLocaleDateString()}
- Total Amount: KES ${requisition.totalAmount.toLocaleString()}
- Status: ${requisition.status}
- Created: ${new Date(requisition.createdAt).toLocaleDateString()}
${requisition.authorizedAt ? `- Authorized: ${new Date(requisition.authorizedAt).toLocaleDateString()}` : ''}
${requisition.authoriserNotes ? `- Authoriser Notes: ${requisition.authoriserNotes}` : ''}

Items:
${itemsSummary}

${requisition.items.some(item => item.totalPrice > 100000) ? '\n⚠️ Note: Contains high-value items (>KES 100,000)' : ''}
`;

    const prompt = `
You are an AI Procurement Approver Assistant for NiRu DRS.
Analyze this requisition and provide an approval recommendation:

${requisitionSummary}

Please evaluate:
1. Compliance with procurement policies
2. Budget appropriateness
3. Justification quality (based on activity description)
4. Documentation completeness (documents are attached: ${requisition.documentUrl || requisition.documentUrls ? 'Yes' : 'No'})
5. Value for money
6. Any red flags or concerns

Respond with:
- A clear decision: "APPROVED" or "REJECTED"
- A brief, concise reason (2-3 sentences maximum)
- Any key concerns or recommendations

Format your response starting with either "APPROVED:" or "REJECTED:" followed by your reasoning.
`;

    try {
      // Try API endpoint first (for production/Vercel)
      let res = await fetch("/api/approval-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      // If API endpoint fails (e.g., in local dev), try calling Groq directly
      if (!res.ok && import.meta.env.DEV) {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (apiKey) {
          res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: "You are a procurement approver AI assistant. Provide clear approval decisions with concise reasoning." },
                { role: "user", content: prompt },
              ],
              temperature: 0.5,
            }),
          });
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.reply || data?.choices?.[0]?.message?.content?.trim() || "No response from AI";
      setAiResponse(reply);
      onSuggestion?.(reply);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Determine if suggestion is APPROVED or REJECTED
  const isApproved = aiResponse?.toUpperCase().includes('APPROVED');
  const isRejected = aiResponse?.toUpperCase().includes('REJECTED');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Approval Assistant
        </CardTitle>
        <p className="text-sm text-gray-600">
          Get AI-powered approval recommendations for this requisition
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleAnalyze}
          disabled={loading || requisition.status !== 'authorized'}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Get AI Suggestion
            </>
          )}
        </Button>

        {requisition.status !== 'authorized' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              AI suggestions are only available for authorized requisitions awaiting approval.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {aiResponse && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isApproved ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : isRejected ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <span className="font-medium">
                {isApproved 
                  ? "AI Recommendation: APPROVE" 
                  : isRejected 
                  ? "AI Recommendation: REJECT" 
                  : "AI Analysis:"}
              </span>
            </div>
            <div className={`p-4 rounded-lg border ${
              isApproved 
                ? 'bg-green-50 border-green-200' 
                : isRejected 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className={`text-sm whitespace-pre-line ${
                isApproved 
                  ? 'text-green-800' 
                  : isRejected 
                  ? 'text-red-800' 
                  : 'text-blue-800'
              }`}>
                {aiResponse}
              </div>
            </div>
            {isApproved && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                ✓ Recommended for Approval
              </Badge>
            )}
            {isRejected && (
              <Badge variant="outline" className="text-red-600 border-red-300">
                ✗ Recommended for Rejection
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Requisition Summary:</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>Activity:</strong> {requisition.activity}</div>
            <div><strong>Total Amount:</strong> KES {requisition.totalAmount.toLocaleString()}</div>
            <div><strong>Items:</strong> {requisition.items.length} item(s)</div>
            <div><strong>Staff:</strong> {requisition.staffName}</div>
            {requisition.authoriserNotes && (
              <div><strong>Authoriser Notes:</strong> {requisition.authoriserNotes}</div>
            )}
            {requisition.totalAmount > 100000 && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 mt-2">
                High Value - KES {requisition.totalAmount.toLocaleString()}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalAssistant;

