import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("renders masked by default with accessible Show password toggle", () => {
    const html = renderToStaticMarkup(
      <PasswordInput
        placeholder="Chalkpad password"
        value="s3cr3t!"
        onChange={() => {}}
        autoComplete="current-password"
        required
      />
    );

    expect(html).toContain('type="password"');
    expect(html).toContain('value="s3cr3t!"');
    expect(html).toContain('placeholder="Chalkpad password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('required=""');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("includes right-side padding on the input so text does not overlap the eye button", () => {
    const html = renderToStaticMarkup(<PasswordInput value="" onChange={() => {}} />);
    expect(html).toContain("pr-12");
  });
});
