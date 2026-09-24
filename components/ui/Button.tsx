import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-900",
  secondary:
    "bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300",
  ghost:
    "bg-transparent text-neutral-700 hover:bg-neutral-100 border border-transparent",
  danger:
    "bg-white text-red-700 hover:bg-red-50 border border-red-200",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className = "", variant = "secondary", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-50 disabled:pointer-events-none min-h-[44px] ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);
