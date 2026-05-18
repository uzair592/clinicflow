import { ShieldAlert, CheckCircle2 } from 'lucide-react';

const AIResponse = ({ isLoading, response, fallbackMsg }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 w-full animate-pulse space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        </div>
        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded w-5/6"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!response) return null;

  if (response.fallback) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 w-full flex items-start space-x-3">
        <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-amber-800 font-semibold mb-1">AI Unavailable</h4>
          <p className="text-amber-700 text-sm">{response.message || fallbackMsg || "Please use manual diagnosis."}</p>
        </div>
      </div>
    );
  }

  // Determine if it's a symptom check response or plain explanation
  const isSymptomCheck = response.conditions;

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-6 w-full shadow-sm">
      <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-3">
        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
          <span className="text-blue-600 text-xs font-bold">AI</span>
        </div>
        <h4 className="font-semibold text-slate-800">AI Analysis Complete</h4>
      </div>

      {isSymptomCheck ? (
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</span>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                response.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                response.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {response.riskLevel?.toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Possible Conditions</span>
            <ul className="mt-2 space-y-1">
              {response.conditions?.map((c, i) => (
                <li key={i} className="flex items-start space-x-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          {response.suggestedTests && response.suggestedTests.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Tests</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {response.suggestedTests.map((t, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="prose prose-sm prose-slate max-w-none">
          <p className="whitespace-pre-wrap">{response.explanation || response}</p>
        </div>
      )}
    </div>
  );
};

export default AIResponse;
