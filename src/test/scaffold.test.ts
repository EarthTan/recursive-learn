describe("test scaffold", () => {
  it("loads the jsdom environment and jest-dom matchers", () => {
    const node = document.createElement("main");

    document.body.appendChild(node);

    expect(node).toBeInTheDocument();
  });
});
