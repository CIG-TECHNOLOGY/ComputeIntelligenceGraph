import type { Metadata } from "next";
import { LandingLayout } from "../../components/LandingLayout";
import InstallContent from "./InstallContent";
import {
  CIG_CLI_NPM_URL,
  CIG_CLI_SOURCE_URL,
} from "../../lib/publishedCli";

export const metadata: Metadata = {
  title: "Install CIG",
  description:
    "Install CIG from the public cig.lat installer, then use the guided setup wizard to bootstrap the discovery-first bundle from pinned Docker Hub images.",
  alternates: {
    canonical: "/install",
  },
};

export default function InstallPage() {
  return (
    <LandingLayout>
      <InstallContent
        cliNpmUrl={CIG_CLI_NPM_URL}
        cliSourceUrl={CIG_CLI_SOURCE_URL}
      />
    </LandingLayout>
  );
}
