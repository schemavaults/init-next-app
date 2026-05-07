export function cypressTsconfigTemplate(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "es2018",
        lib: ["es2018", "dom"],
        module: "esnext",
        moduleResolution: "node",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        isolatedModules: true,
        types: ["cypress", "node"],
      },
      include: ["**/*.ts"],
    },
    null,
    2,
  );
}

export default cypressTsconfigTemplate;
