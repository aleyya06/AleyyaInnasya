import { useState, type FormEvent } from "react";
import { profile } from "../../data/portfolio";
import { SectionHeader } from "../ui/SectionHeader";

type Field = "name" | "email" | "message";
type Errors = Partial<Record<Field, string>>;

const emailOK = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Please add your name.";
  if (!values.email.trim()) errors.email = "Please add an email address I can reply to.";
  else if (!emailOK(values.email.trim())) errors.email = "That email address doesn't look complete.";
  if (!values.message.trim()) errors.message = "Please write a short message.";
  return errors;
}

/** There is no server behind the site, so the form hands the message to the visitor's email app. */
export function ContactFooter() {
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [note, setNote] = useState("Opens your email app with the message ready to send.");

  const set = (field: Field) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const onBlur = (field: Field) => () => {
    if (!values[field]) return;
    const fieldError = validate(values)[field];
    setErrors((prev) => ({ ...prev, [field]: fieldError }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      setNote("A field needs attention before the message can be sent.");
      return;
    }
    const name = values.name.trim();
    const subject = `Message from ${name} via aleyya.my.id`;
    const body = `${values.message.trim()}\n\n${name}\n${values.email.trim()}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setNote(`Your email app should open with the message ready. If it doesn't, write to ${profile.email} directly.`);
  };

  const field = (id: Field, label: string, type: "text" | "email" | "textarea", autoComplete?: string) => (
    <div className={`field${type === "textarea" ? " field--wide" : ""}`}>
      <label htmlFor={`f-${id}`}>{label}</label>
      {type === "textarea" ? (
        <textarea
          id={`f-${id}`} name={id} rows={4} maxLength={1500} required
          value={values[id]} onChange={set(id)} onBlur={onBlur(id)}
          aria-invalid={errors[id] ? true : undefined}
          aria-describedby={errors[id] ? `f-${id}-err` : undefined}
        />
      ) : (
        <input
          id={`f-${id}`} name={id} type={type} autoComplete={autoComplete} required
          value={values[id]} onChange={set(id)} onBlur={onBlur(id)}
          aria-invalid={errors[id] ? true : undefined}
          aria-describedby={errors[id] ? `f-${id}-err` : undefined}
        />
      )}
      <p className="field__error" id={`f-${id}-err`}>{errors[id] ?? ""}</p>
    </div>
  );

  return (
    <section className="section section--plum" id="contact" aria-labelledby="contactTitle">
      <div className="section__inner">
        <SectionHeader
          kicker="[04] Contact"
          title="Let's connect."
          titleId="contactTitle"
          action={{ label: profile.email, href: `mailto:${profile.email}` }}
        />
        <form className="inquiry" noValidate onSubmit={onSubmit} data-reveal>
          {field("name", "Name", "text", "name")}
          {field("email", "Email", "email", "email")}
          {field("message", "Message", "textarea")}
          <div className="inquiry__actions">
            <button className="btn" type="submit">Send via email <span aria-hidden="true">→</span></button>
            <p className="inquiry__note" role="status">{note}</p>
          </div>
        </form>
        <p className="contact__links">
          <a className="link" href={profile.linkedin} target="_blank" rel="noopener">LinkedIn ↗</a>
          <a className="link" href={`mailto:${profile.email}`}>{profile.email}</a>
          <span>{profile.location}</span>
        </p>
        <footer className="footer">
          <span>© 2026 aleyya.my.id · {profile.fullName}</span>
          <a className="link" href="#hero">Back to top ↑</a>
        </footer>
      </div>
    </section>
  );
}
