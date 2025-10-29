import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, CheckCircle, AlertTriangle, Info } from "lucide-react";

const OPENROUTER_API_KEY = (import.meta as any)?.env?.VITE_OPENROUTER_API_KEY as string | undefined;

interface PolicyAssistantProps {
  requisitionData?: {
    activity: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>;
    totalAmount: number;
  };
  onRecommendations?: (recommendations: string) => void;
}

const PolicyAssistant: React.FC<PolicyAssistantProps> = ({ requisitionData, onRecommendations }) => {
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAiResponse(null);

    // Build requisition summary from form data
    const requisitionSummary = requisitionData 
      ? `
Activity: ${requisitionData.activity}
Total Amount: KES ${requisitionData.totalAmount.toLocaleString()}
Items:
${requisitionData.items.map(item => 
  `- ${item.description} (Qty: ${item.quantity}, Unit: KES ${item.unitPrice.toLocaleString()}, Total: KES ${item.totalPrice.toLocaleString()})`
).join('\n')}
      `
      : "No requisition data provided";

    const prompt = `
You are an AI Procurement Policy Assistant for NiRu DRS.
Analyze this requisition and provide compliance recommendations:

${requisitionSummary}

Please check:
- Quotations required for items above KES 100,000
- Approval requirements for high-value items
- Sufficient justification for purchases
- Budget compliance
- Documentation requirements

Respond with specific, actionable recommendations in bullet points.
`;

    try {

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Policy Assistant Prototype",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-235b-a22b:free",
          messages: [
            {
              role: "system",
              content:
                "You are an AI Procurement Policy Assistant. Give concise, factual, and clearly formatted answers (no asterisks or markdown). Limit output to about 6 lines per response.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await res.json();
      let message: string | undefined =
        data?.choices?.[0]?.message?.content?.trim() ||
        data?.choices?.[0]?.message?.reasoning?.trim() ||
        data?.choices?.[0]?.message?.reasoning_details?.[0]?.text?.trim();

      if (!message) {
        message = "No valid content from model.";
      }

      if (message.length > 800) {
        message = message.substring(0, 800) + "...";
      }

      setAiResponse(message);
      onRecommendations?.(message);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          AI Policy Assistant
        </CardTitle>
        <p className="text-sm text-gray-600">
          Get AI-powered compliance recommendations for your requisition
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        

        <Button
          onClick={handleAnalyze}
          disabled={loading || !requisitionData}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analyze Requisition
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {aiResponse && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">AI Recommendations:</span>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800 whitespace-pre-line">
                {aiResponse}
              </div>
            </div>
          </div>
        )}

        {requisitionData && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Requisition Summary:</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Activity:</strong> {requisitionData.activity}</div>
              <div><strong>Total Amount:</strong> KES {requisitionData.totalAmount.toLocaleString()}</div>
              <div><strong>Items:</strong> {requisitionData.items.length} item(s)</div>
              {requisitionData.totalAmount > 100000 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  High Value - Quotations Required
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PolicyAssistant;
