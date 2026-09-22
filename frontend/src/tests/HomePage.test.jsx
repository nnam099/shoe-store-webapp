import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../App.jsx";

const globalCss = readFileSync(resolve("src/styles/global.css"), "utf8");

describe("HomePage", () => {
  it("renders an empty main element without Tailwind utility classes", () => {
    const { container } = render(<App />);
    const main = container.querySelector("main");

    expect(main).toBeInTheDocument();
    expect(main).toBeEmptyDOMElement();
    expect(main).not.toHaveAttribute("class");
    expect(container).not.toHaveTextContent(/\S/);
  });

  it("keeps the document background white", () => {
    expect(globalCss).toMatch(/body\s*{[^}]*background:\s*#fff;/);
  });
});
