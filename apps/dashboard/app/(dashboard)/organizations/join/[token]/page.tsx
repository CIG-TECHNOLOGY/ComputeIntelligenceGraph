"use client";

import { useParams } from "next/navigation";
import { OrganizationAccessLink } from "../../../../../components/OrganizationAccessLink";

export default function AcceptOrganizationJoinLinkPage() {
  const params = useParams<{ token: string }>();
  return <OrganizationAccessLink kind="join-links" token={params.token} />;
}
