const fs = require('fs');
let code = fs.readFileSync('mobile-app/residents/src/components/payments/PaymentJourney.tsx', 'utf8');

code = code.replace(/className=\{\\self-start rounded-md px-2\.5 py-1 \\\\}/g, "className={`self-start rounded-md px-2.5 py-1 ${styles}`}");
code = code.replace(/className=\{\\mt-6 items-center rounded-xl py-3\.5 \\\\}/g, "className={`mt-6 items-center rounded-xl py-3.5 ${disabled ? 'bg-slate-300' : 'bg-brand active:bg-brand-dark'}`}");
code = code.replace(/className=\{\\items-center rounded-2xl border px-5 py-6 \\\\}/g, "className={`items-center rounded-2xl border px-5 py-6 ${isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}");
code = code.replace(/className=\{\\h-14 w-14 items-center justify-center rounded-full \\\\}/g, "className={`h-14 w-14 items-center justify-center rounded-full ${isCompleted ? 'bg-emerald-100' : 'bg-amber-100'}`}");

fs.writeFileSync('mobile-app/residents/src/components/payments/PaymentJourney.tsx', code);
