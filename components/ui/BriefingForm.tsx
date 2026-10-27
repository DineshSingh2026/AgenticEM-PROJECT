"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface BriefingFormProps {
  variant?: "briefing" | "sandbox";
  className?: string;
}

const c = copy.site.briefing;

const schema = z.object({
  name: z.string().trim().min(2, c.errors.name).max(120, c.errors.name),
  email: z.string().trim().email(c.errors.email).max(200, c.errors.email),
  company: z.string().trim().min(2, c.errors.company).max(160, c.errors.company),
  jurisdiction: z.string().min(1, c.errors.jurisdiction),
  role: z.string().min(1, c.errors.role),
  message: z.string().max(2000, c.errors.message),
  consent: z.boolean().refine((v) => v, c.errors.consent),
  website: z.string(),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-btn border border-line bg-bg/60 px-3.5 py-3 text-[15px] text-text placeholder:text-text-faint transition-colors duration-200 ease-out hover:border-line-strong focus:border-copper focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper aria-[invalid=true]:border-data-red/70";
const selectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23C9825B' stroke-width='1.2'/%3E%3C/svg%3E\")",
} as const;

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="t-label text-text-dim">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="t-label text-[11px] normal-case tracking-normal text-data-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BriefingForm({ variant = "briefing", className }: BriefingFormProps) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const sandbox = variant === "sandbox";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues = useMemo<FormValues>(
    () => ({ name: "", email: "", company: "", jurisdiction: "", role: "", message: "", consent: false, website: "" }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues, mode: "onTouched" });

  const onSubmit = async (values: FormValues) => {
    setStatus("loading");
    setServerError(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, variant }),
      });
      if (!res.ok) {
        setServerError(res.status === 429 ? c.errors.rateLimited : c.errors.submit);
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setServerError(c.errors.submit);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div role="status" className={cn("flex flex-col gap-3 border border-copper/40 bg-bg-elev/70 p-6", className)}>
        <p className="t-label text-[13px] text-copper">{sandbox ? c.sandbox.success : c.success}</p>
        <p className="text-[15px] text-text-dim">{c.successBody}</p>
      </div>
    );
  }

  const describe = (k: keyof FormValues) => (errors[k] ? `${id(k)}-err` : undefined);
  const invalid = (k: keyof FormValues) => (errors[k] ? true : undefined);

  return (
    <form
      noValidate
      aria-label={sandbox ? c.sandbox.formLabel : c.formLabel}
      onSubmit={handleSubmit(onSubmit)}
      className={cn("relative grid grid-cols-1 gap-5 md:grid-cols-2", className)}
    >
      <Field id={id("name")} label={c.fields.name.label} error={errors.name?.message}>
        <input
          id={id("name")}
          type="text"
          autoComplete="name"
          placeholder={c.fields.name.placeholder}
          aria-invalid={invalid("name")}
          aria-describedby={describe("name")}
          aria-required="true"
          className={inputCls}
          {...register("name")}
        />
      </Field>
      <Field id={id("email")} label={c.fields.email.label} error={errors.email?.message}>
        <input
          id={id("email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={c.fields.email.placeholder}
          aria-invalid={invalid("email")}
          aria-describedby={describe("email")}
          aria-required="true"
          className={inputCls}
          {...register("email")}
        />
      </Field>
      <Field id={id("company")} label={c.fields.company.label} error={errors.company?.message} className="md:col-span-2">
        <input
          id={id("company")}
          type="text"
          autoComplete="organization"
          placeholder={c.fields.company.placeholder}
          aria-invalid={invalid("company")}
          aria-describedby={describe("company")}
          aria-required="true"
          className={inputCls}
          {...register("company")}
        />
      </Field>
      <Field id={id("jurisdiction")} label={c.fields.jurisdiction.label} error={errors.jurisdiction?.message}>
        <select
          id={id("jurisdiction")}
          aria-invalid={invalid("jurisdiction")}
          aria-describedby={describe("jurisdiction")}
          aria-required="true"
          className={cn(inputCls, "appearance-none bg-[length:10px] bg-[right_14px_center] bg-no-repeat pr-9")}
          style={selectStyle}
          {...register("jurisdiction")}
        >
          <option value="">{c.fields.jurisdiction.placeholder}</option>
          {c.jurisdictions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("role")} label={c.fields.role.label} error={errors.role?.message}>
        <select
          id={id("role")}
          aria-invalid={invalid("role")}
          aria-describedby={describe("role")}
          aria-required="true"
          className={cn(inputCls, "appearance-none bg-[length:10px] bg-[right_14px_center] bg-no-repeat pr-9")}
          style={selectStyle}
          {...register("role")}
        >
          <option value="">{c.fields.role.placeholder}</option>
          {c.roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id={id("message")}
        label={sandbox ? c.sandbox.messageLabel : c.fields.message.label}
        error={errors.message?.message}
        className="md:col-span-2"
      >
        <textarea
          id={id("message")}
          rows={4}
          placeholder={sandbox ? c.sandbox.messagePlaceholder : c.fields.message.placeholder}
          aria-invalid={invalid("message")}
          aria-describedby={describe("message")}
          className={cn(inputCls, "resize-y")}
          {...register("message")}
        />
      </Field>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>{c.fields.website.label}</label>
        <input id={id("website")} type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="flex flex-col gap-2 md:col-span-2">
        <div className="flex items-start gap-3">
          <input
            id={id("consent")}
            type="checkbox"
            aria-invalid={invalid("consent")}
            aria-describedby={describe("consent")}
            aria-required="true"
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[1px] border border-line-strong bg-bg/60 checked:border-copper checked:bg-copper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper aria-[invalid=true]:border-data-red/70"
            {...register("consent")}
          />
          <label htmlFor={id("consent")} className="text-[14px] leading-relaxed text-text-dim">
            {c.fields.consent.label}{" "}
            <Link href={c.privacy.href} className="text-text underline decoration-copper/60 underline-offset-4 hover:decoration-copper">
              {c.privacy.label}
            </Link>
          </label>
        </div>
        {errors.consent?.message ? (
          <p id={`${id("consent")}-err`} className="t-label pl-7 text-[11px] normal-case tracking-normal text-data-red">
            {errors.consent.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <Button type="submit" disabled={status === "loading"} className="w-full md:w-auto">
          {status === "loading" ? c.submitting : sandbox ? c.sandbox.submit : c.submit}
        </Button>
        <p role="alert" className="t-label text-[11px] text-data-red">
          {status === "error" && serverError ? serverError : null}
        </p>
      </div>
    </form>
  );
}
