import { canSubmitPermanentAlias, getPermanentAnalyticsAlias } from "../analyticsAlias";

describe("permanent analytics aliases", () => {
  it("keeps hostname editing available while DNS readiness is being checked", () => {
    expect(canSubmitPermanentAlias({ publicAccessEnabled: true, aliasValid: true, mutationPending: false })).toBe(true);
  });

  it("only locks the action while the alias request itself is pending", () => {
    expect(canSubmitPermanentAlias({ publicAccessEnabled: true, aliasValid: true, mutationPending: true })).toBe(false);
    expect(canSubmitPermanentAlias({ publicAccessEnabled: false, aliasValid: true, mutationPending: false })).toBe(false);
    expect(canSubmitPermanentAlias({ publicAccessEnabled: true, aliasValid: false, mutationPending: false })).toBe(false);
  });

  it("recognizes only one-label technology analytics hosts", () => {
    expect(getPermanentAnalyticsAlias("hashpass-tech.analytics.cig.technology")).toBe("hashpass-tech");
    expect(getPermanentAnalyticsAlias("HASH_PASS.analytics.cig.technology")).toBe("hash_pass");
    expect(getPermanentAnalyticsAlias("analytics.cig.technology")).toBeNull();
    expect(getPermanentAnalyticsAlias("nested.hashpass-tech.analytics.cig.technology")).toBeNull();
    expect(getPermanentAnalyticsAlias("hashpass-tech.analytics.cig.lat")).toBeNull();
  });
});
