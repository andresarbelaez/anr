"use client";

import { Fragment, type ReactNode } from "react";

export const CRM_CONTACT_WIZARD_STEPS = [
  "Basic info",
  "Social media",
  "Collaborations",
] as const;

export function crmLabelRequired(field: string): ReactNode {
  return (
    <>
      {field}
      <span className="ml-1 whitespace-nowrap text-xs font-normal text-neutral-500">
        *required
      </span>
    </>
  );
}

export function crmLabelOptional(field: string): ReactNode {
  return (
    <>
      {field}
      <span className="ml-1 whitespace-nowrap text-xs font-normal text-neutral-500">
        (optional)
      </span>
    </>
  );
}

type StepperProps = {
  step: number;
  onGoToStep: (index: number) => void;
  embedded: boolean;
};

export function CrmContactWizardStepper({
  step,
  onGoToStep,
  embedded,
}: StepperProps) {
  return (
    <div className={embedded ? "mb-4 mt-1" : "mt-8 mb-6"}>
      {embedded ? (
        <div className="overflow-x-auto pb-0.5">
          <div className="flex w-max min-w-full flex-nowrap items-center">
            {CRM_CONTACT_WIZARD_STEPS.map((label, i) => (
              <Fragment key={label}>
                {i > 0 ? (
                  <div
                    className={`mx-1 h-px min-w-[6px] flex-1 max-sm:max-w-[20px] ${
                      i <= step ? "bg-neutral-600" : "bg-neutral-800"
                    }`}
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => i < step && onGoToStep(i)}
                  disabled={i > step}
                  className="flex shrink-0 items-center gap-1.5"
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                      i <= step
                        ? "bg-white text-black"
                        : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`whitespace-nowrap text-[11px] font-medium leading-tight sm:text-xs ${
                      i <= step ? "text-white" : "text-neutral-500"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {CRM_CONTACT_WIZARD_STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => i < step && onGoToStep(i)}
              disabled={i > step}
              className="flex items-center gap-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition ${
                  i <= step
                    ? "bg-white text-black"
                    : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  i <= step ? "text-white" : "text-neutral-500"
                }`}
              >
                {label}
              </span>
              {i < CRM_CONTACT_WIZARD_STEPS.length - 1 && (
                <div className="mx-2 hidden h-px w-8 bg-neutral-800 sm:block" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
