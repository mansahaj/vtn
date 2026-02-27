module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["e2e/support/**/*.ts", "e2e/steps/**/*.ts"],
    paths: ["e2e/features/**/*.feature"],
    format: [
      "progress-bar",
      "html:e2e/reports/cucumber-report.html",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
  },
};
