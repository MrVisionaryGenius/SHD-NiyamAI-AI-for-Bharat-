'use client';

interface RiskScoreCardProps {
  title: string;
  score: number;
  severity: 'low' | 'medium' | 'high';
  assessmentType?: 'contract' | 'invoice' | 'security';
}

export function RiskScoreCard({ title, score, severity, assessmentType }: RiskScoreCardProps) {
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getScoreColor = (s: number) => {
    if (s <= 33) return 'text-green-600';
    if (s <= 66) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'contract':
        return '📄';
      case 'invoice':
        return '🧾';
      case 'security':
        return '🔒';
      default:
        return '📊';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getTypeIcon(assessmentType)}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
            severity
          )}`}
        >
          {severity.toUpperCase()}
        </span>
      </div>
      <div className="flex items-baseline">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-gray-500 ml-2">/100</span>
      </div>
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            score <= 33 ? 'bg-green-500' : score <= 66 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
