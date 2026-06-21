// @vitest-environment jsdom

import "../setup/dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactApp from "@/components/apps/ContactApp";
import { contactLinks, identity } from "@/data/aboutMe";

/**
 * ContactApp ("Ping Me") - editorial redesign.
 *
 * Covers the load-bearing behaviour that the redesign must preserve: the
 * identity masthead + reach-me rows, per-field validation, the real POST to
 * /api/contact, and the submitting / success / error states. Plus the persona
 * guarantee: no student / graduation / degree / visa wording ever renders.
 *
 * Inputs are driven with user-event (the suite-wide convention) so controlled
 * fields update reliably, including a second edit of the same field.
 */

const PERSONA_BANNED =
  /\b(student|pursuing|seeking|graduation|graduated|degree|university|visa|f-?1|opt)\b/i;

type User = ReturnType<typeof userEvent.setup>;

async function fillValidForm(user: User) {
  await user.type(screen.getByPlaceholderText("Your name"), "Jordan");
  await user.type(screen.getByPlaceholderText("you@company.com"), "jordan@acme.com");
  await user.type(screen.getByPlaceholderText("What's on your mind?"), "Founding engineer role");
  await user.type(
    screen.getByPlaceholderText(/Tell me about the opportunity/i),
    "We are hiring and your MCP work looks like a fit.",
  );
}

describe("ContactApp identity masthead", () => {
  it("renders the serif name and the reach-me link rows from data", () => {
    render(<ContactApp />);

    expect(screen.getByRole("heading", { name: identity.name })).toBeInTheDocument();

    const email = screen.getByRole("link", { name: new RegExp(contactLinks.email, "i") });
    expect(email).toHaveAttribute("href", `mailto:${contactLinks.email}`);

    const linkedin = screen.getByRole("link", {
      name: new RegExp("linkedin", "i"),
    });
    expect(linkedin).toHaveAttribute("href", contactLinks.linkedin);
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("never renders student / graduation / degree / visa wording", () => {
    const { container } = render(<ContactApp />);
    expect(container.textContent ?? "").not.toMatch(PERSONA_BANNED);
  });
});

describe("ContactApp validation", () => {
  it("blocks submit and surfaces per-field errors when empty", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<ContactApp />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    // Required markers appear (mono copy, no colored chips).
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    fetchSpy.mockRestore();
  });

  it("rejects an invalid email", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<ContactApp />);
    await fillValidForm(user);

    const emailInput = screen.getByPlaceholderText("you@company.com");
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});

describe("ContactApp submission", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to /api/contact and shows the success state", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    render(<ContactApp />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByText(/thanks for reaching out/i)).toBeInTheDocument(),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({
      name: "Jordan",
      email: "jordan@acme.com",
      subject: "Founding engineer role",
    });

    // Success offers a reset back to the form.
    expect(screen.getByRole("button", { name: /send another/i })).toBeInTheDocument();
  });

  it("shows the error state and allows retry when the request fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    render(<ContactApp />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByText(/something broke on my end/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
