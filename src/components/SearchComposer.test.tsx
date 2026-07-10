import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchComposer } from "./SearchComposer";

describe("SearchComposer", () => {
  it("creates include, exclude, OR, and system chips from keyboard input", async () => {
    const user = userEvent.setup();
    let tokens: any[] = [];
    const onChange = vi.fn((next) => {
      tokens = next;
    });
    const { rerender } = render(
      <SearchComposer
        tokens={tokens}
        onChange={onChange}
        onSearch={() => {}}
      />,
    );
    const input = screen.getByLabelText("Search tags");
    for (const value of ["cat", "-spoiler", "red | blue", "system:inbox"]) {
      await user.type(input, `${value}{Enter}`);
      tokens = onChange.mock.calls.at(-1)![0];
      rerender(
        <SearchComposer
          tokens={tokens}
          onChange={onChange}
          onSearch={() => {}}
        />,
      );
    }
    expect(tokens.map((t) => t.kind)).toEqual([
      "include",
      "exclude",
      "or",
      "system",
    ]);
  });
  it("removes the last chip with Backspace", async () => {
    const onChange = vi.fn();
    render(
      <SearchComposer
        tokens={[{ id: "1", kind: "include", value: "cat" }]}
        onChange={onChange}
        onSearch={() => {}}
      />,
    );
    await userEvent.type(screen.getByLabelText("Search tags"), "{Backspace}");
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
