import type { ComponentPropsWithoutRef, ReactNode } from "react";

const cx = (...parts: Array<string | false | undefined>): string => parts.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-brand-900/10 hover:bg-brand-700 hover:shadow-md",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100",
  ghost: "text-slate-700 hover:bg-slate-100"
};

export const Button = ({ variant = "primary", className, ...props }: ButtonProps) => (
  <button
    {...props}
    className={cx(
      "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium shadow-sm",
      "transition-all duration-200 ease-out motion-safe:hover:-translate-y-px",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0",
      buttonStyles[variant],
      className
    )}
  />
);

type InputProps = ComponentPropsWithoutRef<"input">;

export const Input = ({ className, ...props }: InputProps) => (
  <input
    {...props}
    className={cx(
      "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm",
      "transition-shadow duration-150 ease-out",
      "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
      "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
      className
    )}
  />
);

type SelectProps = ComponentPropsWithoutRef<"select">;

export const Select = ({ className, ...props }: SelectProps) => (
  <select
    {...props}
    className={cx(
      "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm",
      "transition-shadow duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
      "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
      className
    )}
  />
);

type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export const Textarea = ({ className, ...props }: TextareaProps) => (
  <textarea
    {...props}
    className={cx(
      "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
      "transition-shadow duration-150 ease-out",
      "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
      "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
      className
    )}
  />
);

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Card = ({ title, subtitle, actions, children, className }: CardProps) => (
  <section
    className={cx(
      "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5",
      "transition-shadow duration-200 ease-out hover:shadow-md hover:shadow-slate-900/5",
      className
    )}
  >
    {title || subtitle || actions ? (
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {title ? <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2> : null}
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
}

export const PanelHeader = ({ title, subtitle }: PanelHeaderProps) => (
  <div className="mb-4">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700">{title}</h3>
    {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export const EmptyState = ({ title, description, actions }: EmptyStateProps) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <p className="font-medium text-slate-800">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
    {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
  </div>
);

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cx("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />
);
