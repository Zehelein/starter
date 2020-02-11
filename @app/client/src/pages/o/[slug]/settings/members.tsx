import React, { FC, useCallback, useState } from "react";
import { NextPage } from "next";
import {
  OrganizationPageOrganizationFragment,
  useOrganizationMembersQuery,
  OrganizationMembers_MembershipFragment,
  SharedLayout_UserFragment,
  useRemoveFromOrganizationMutation,
} from "@app/graphql";
import SharedLayout from "../../../../layout/SharedLayout";
import { H3, Redirect } from "@app/components";
import useOrganization from "../../../../lib/useOrganization";
import OrganizationSettingsLayout from "../../../../layout/OrganizationSettingsLayout";
import { List } from "antd";
import Text from "antd/lib/typography/Text";

const OrganizationSettingsPage: NextPage = () => {
  const { organization, fallbackChild, slug } = useOrganization();
  return (
    <SharedLayout title={organization?.name ?? slug} noPad>
      {({ currentUser }) =>
        fallbackChild || (
          <OrganizationSettingsPageInner
            organization={organization!}
            currentUser={currentUser}
          />
        )
      }
    </SharedLayout>
  );
};

interface OrganizationSettingsPageInnerProps {
  currentUser?: SharedLayout_UserFragment | null;
  organization: OrganizationPageOrganizationFragment;
}

// This needs to match the `first:` used in OrganizationMembers.graphql
const RESULTS_PER_PAGE = 10;

const OrganizationSettingsPageInner: FC<OrganizationSettingsPageInnerProps> = props => {
  const { organization, currentUser } = props;
  const [page, setPage] = useState(1);
  const { data } = useOrganizationMembersQuery({
    variables: {
      slug: organization.slug,
      offset: (page - 1) * RESULTS_PER_PAGE,
    },
  });

  const handlePaginationChange = (
    page: number
    //pageSize?: number | undefined
  ) => {
    setPage(page);
  };

  const renderItem = useCallback(
    (node: OrganizationMembers_MembershipFragment) => (
      <OrganizationMemberListItem
        node={node}
        organization={organization}
        currentUser={currentUser}
      />
    ),
    [currentUser, organization]
  );

  if (
    !organization.currentUserIsBillingContact &&
    !organization.currentUserIsOwner
  ) {
    return <Redirect href={`/o/${organization.slug}`} />;
  }

  return (
    <OrganizationSettingsLayout
      organization={organization}
      href={`/o/${organization.slug}/settings/members`}
    >
      <div>
        <H3>{organization.name} Members</H3>
        <p>Members</p>
        <List
          dataSource={
            data?.organizationBySlug?.organizationMemberships?.nodes ?? []
          }
          pagination={{
            current: page,
            pageSize: RESULTS_PER_PAGE,
            total:
              data?.organizationBySlug?.organizationMemberships?.totalCount,
            onChange: handlePaginationChange,
          }}
          renderItem={renderItem}
        />
      </div>
    </OrganizationSettingsLayout>
  );
};

interface OrganizationMemberListItemProps {
  node: OrganizationMembers_MembershipFragment;
  organization: OrganizationPageOrganizationFragment;
  currentUser?: SharedLayout_UserFragment | null;
}

const OrganizationMemberListItem: FC<OrganizationMemberListItemProps> = props => {
  const { node, organization, currentUser } = props;
  const [removeMember] = useRemoveFromOrganizationMutation();
  const handleRemove = useCallback(() => {
    removeMember({
      variables: {
        organizationId: organization.id,
        userId: node.user?.id ?? 0,
      },
      refetchQueries: ["OrganizationMembers"],
    });
  }, [node.user, organization.id, removeMember]);
  const roles = [
    node.isOwner ? "owner" : null,
    node.isBillingContact ? "billing contact" : null,
  ]
    .filter(Boolean)
    .join(" and ");
  return (
    <List.Item
      actions={[
        organization.currentUserIsOwner && node.user?.id !== currentUser?.id ? (
          <a onClick={handleRemove} key="remove">
            Remove
          </a>
        ) : null,
      ].filter(Boolean)}
    >
      <List.Item.Meta
        //avatar={...}
        title={node.user?.name}
        description={
          <div>
            <Text>{node.user?.username}</Text>
            {roles ? (
              <div>
                <Text type="secondary">({roles})</Text>
              </div>
            ) : null}
          </div>
        }
      />
    </List.Item>
  );
};

export default OrganizationSettingsPage;