"use client";

import { useParams } from "next/navigation";
import { OrganizationAccessLink } from "../../../../../components/OrganizationAccessLink";

export default function AcceptOrganizationInvitationPage() {
  const params = useParams<{ token: string }>();
  return <OrganizationAccessLink kind="invitations" token={params.token} />;
}
