import {
  getPasswordChecks,
  getPasswordStrength,
  PASSWORD_REQUIREMENTS,
} from '../../lib/password';

type PasswordStrengthHintProps = {
  password: string;
};

export function PasswordStrengthHint({ password }: PasswordStrengthHintProps) {
  if (!password) return null;

  const checks = getPasswordChecks(password);
  const strength = getPasswordStrength(checks);

  return (
    <div className="mt-2">
      <div className="ml-4 mb-[-5px] z-[1] relative h-2.5 w-2.5 rotate-45 border-l border-t border-gray-200 bg-white" />
      <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor: index < strength.score ? strength.color : '#E5E7EB',
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">{strength.label}</span>
        </div>

        <div className="space-y-2">
          {PASSWORD_REQUIREMENTS.map((rule) => {
            const met = checks[rule.key];
            return (
              <div key={rule.key} className="flex items-center gap-2">
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: met ? '#22C55E' : '#9CA3AF' }}
                >
                  ✓
                </div>
                <span className={`text-xs ${met ? 'text-green-500' : 'text-gray-500'}`}>
                  {rule.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
