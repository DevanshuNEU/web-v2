// @vitest-environment jsdom

import "../setup/dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactApp, { failKindFor, validateField } from "@/components/apps/ContactApp";
import { contactLinks } from "@/data/aboutMe";

/**
 * ContactApp ("Ping Me").
 *
 * Covers what the form must guarantee: it leads with the form, errors are
 * tied to their fields and focus moves to the first invalid one, the real
 * POST to /api/contact, the success state takes focus, and a failed send
 * offers status-specific copy, a mailto + copyable email fallback, and a
 * Try again that actually resends. fetch is always mocked: nothing here
 * reaches the contact API.
 */

const PERSONA_BANNED =
  /\b(student|pursuing|seeking|graduation|graduated|degree|university|visa|f-?1|opt)\b/i;

type User = ReturnType<typeof userEvent.setup>;

const field = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement;

async function fillValidForm(user: User) {
  await user.type(field(/^name/i), "Jordan Lee");
  await user.type(field(/^email/i), "jordan@acme.com");
  await user.type(field(/^subject/i), "Role");
  await user.type(field(/^message/i), "We are hiring and your MCP work fits.");
}

const send = () => screen.getByRole("button", { name: /send message/i });

describe("ContactApp layout", () => {
  it("leads with the form heading and keeps the reach-me rows from data", () => {
    render(<ContactApp />);

    expect(screen.getByRole("heading", { level: 1, name: /send a message/i })).toBeInTheDocument();

    const email = screen.getByRole("link", { name: new RegExp(contactLinks.email, "i") });
    expect(email).toHaveAttribute("href", `mailto:${contactLinks.email}`);

    const linkedin = screen.getByRole("link", { name: /linkedin/i });
    expect(linkedin).toHaveAttribute("href", contactLinks.linkedin);
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
    // Readable value, not the raw URL.
    expect(linkedin.textContent).not.toMatch(/https?:\/\//);
  });

  it("never renders student / graduation / degree / visa wording", () => {
    const { container } = render(<ContactApp />);
    expect(container.textContent ?? "").not.toMatch(PERSONA_BANNED);
  });

  it("gives every input autofill hints, a name and a max length", () => {
    render(<ContactApp />);
    expect(field(/^name/i)).toHaveAttribute("autocomplete", "name");
    expect(field(/^email/i)).toHaveAttribute("autocomplete", "email");
    expect(field(/^email/i)).toHaveAttribute("inputmode", "email");
    expect(field(/^company/i)).toHaveAttribute("autocomplete", "organization");
    for (const re of [/^name/i, /^email/i, /^company/i, /^subject/i, /^message/i]) {
      expect(field(re)).toHaveAttribute("name");
      expect(field(re)).toHaveAttribute("maxlength");
    }
    expect(field(/^name/i)).toBeRequired();
    expect(field(/^company/i)).not.toBeRequired();
  });
});

describe("ContactApp validation", () => {
  it("blocks submit, links errors to fields and focuses the first invalid one", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<ContactApp />);

    await user.click(send());

    expect(fetchSpy).not.toHaveBeenCalled();
    const name = field(/^name/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    const describedBy = name.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toMatch(/enter your name/i);
    expect(document.activeElement).toBe(name);
    // Hidden summary for screen readers.
    expect(screen.getByText(/4 fields need attention: Name, Email, Subject, Message/)).toBeInTheDocument();
    // Optional field never gets marked invalid.
    expect(field(/^company/i)).not.toHaveAttribute("aria-invalid");
    fetchSpy.mockRestore();
  });

  it("rejects an invalid email with specific copy", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<ContactApp />);
    await fillValidForm(user);

    const emailInput = field(/^email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");
    await user.click(send());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Enter an email like name@company.com")).toBeInTheDocument();
    expect(document.activeElement).toBe(emailInput);
    fetchSpy.mockRestore();
  });

  it("trims before counting and accepts short real subjects", () => {
    expect(validateField("name", "   a")).not.toBeNull();
    expect(validateField("subject", "Role")).toBeNull();
    expect(validateField("message", "  short  ")).not.toBeNull();
    expect(validateField("message", "Hello there, hiring.")).toBeNull();
  });
});

describe("ContactApp submission", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to /api/contact and focuses the success heading", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    render(<ContactApp />);
    await fillValidForm(user);
    await user.click(send());

    const heading = await screen.findByRole("heading", { name: /thanks, jordan/i });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByText(/jordan@acme.com/)).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ name: "Jordan Lee", email: "jordan@acme.com", subject: "Role" });

    expect(screen.getByRole("button", { name: /write another message/i })).toBeInTheDocument();
  });

  it("on failure keeps the text, offers the email fallback, and Try again resends", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<ContactApp />);
    await fillValidForm(user);
    await user.click(send());

    const banner = await screen.findByTestId("contact-fail");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner.textContent).toMatch(/didn't send/i);
    await waitFor(() => expect(document.activeElement).toBe(banner));
    // Text is still in the form.
    expect(field(/^message/i).value).toMatch(/MCP work/);
    // mailto fallback carries the subject.
    const mail = screen.getAllByRole("link", { name: contactLinks.email }).find((a) =>
      a.getAttribute("href")?.includes("subject="),
    );
    expect(mail?.getAttribute("href")).toMatch(new RegExp(`^mailto:${contactLinks.email}\\?subject=Role`));
    expect(screen.getByRole("button", { name: /copy email/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("heading", { name: /thanks, jordan/i })).toBeInTheDocument();
  });

  it("copies the email address", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 503 }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<ContactApp />);
    await fillValidForm(user);
    await user.click(send());

    const banner = await screen.findByTestId("contact-fail");
    expect(banner.textContent).toMatch(/offline/i);
    // Offline: retrying cannot help, so no Try again.
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.getByRole("link", { name: /open mail app/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
    await user.click(screen.getByRole("button", { name: /copy email/i }));
    expect(writeText).toHaveBeenCalledWith(contactLinks.email);
    expect(await screen.findByRole("button", { name: /email copied/i })).toBeInTheDocument();
  });

  it("maps status codes to failure kinds", () => {
    expect(failKindFor(503)).toBe("offline");
    expect(failKindFor(429)).toBe("rate_limited");
    expect(failKindFor(500)).toBe("failed");
    expect(failKindFor(null)).toBe("failed");
  });
});
