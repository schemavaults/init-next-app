export function claudeSettingsTemplate(): string {
  return (
    JSON.stringify(
      {
        hooks: {
          SessionStart: [
            {
              matcher: "",
              hooks: [
                {
                  type: "command",
                  command: ".claude/hooks/install-deps-in-fresh-environment.sh",
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    ) + "\n"
  );
}

export default claudeSettingsTemplate;
