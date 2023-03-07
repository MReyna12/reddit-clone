import { Community } from "@/atoms/communitiesAtom";
import CreatePost from "@/components/Community/CreatePostLink";
import Header from "@/components/Community/Header";
import CommunityNotFound from "@/components/Community/NotFound";
import PageContent from "@/components/Layout/PageContent";
import Posts from "@/components/Posts/Posts";
import { firestore } from "@/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { GetServerSidePropsContext } from "next";
import React from "react";
import safeJsonStringify from "safe-json-stringify";

type CommunityPageProps = {
  communityData: Community;
};

const CommunityPage: React.FC<CommunityPageProps> = ({ communityData }) => {
  //console.log("here is the data", communityData);

  if (!communityData) {
    return (
      <>
        <CommunityNotFound />
      </>
    );
  }

  return (
    <>
      <Header communityData={communityData} />
      <PageContent>
        <>
          <CreatePost />
          <Posts communityData={communityData} />
        </>
        <>
          <div>right</div>
        </>
      </PageContent>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // get community data and pass to client component
  try {
    const communityDocRef = doc(
      firestore,
      "communities",
      context.query.communityId as string
    );

    const communityDoc = await getDoc(communityDocRef);

    // Because NextJS does not know how to serialize the Timestamp data type (found in the Community interface) I used the safeJsonStringify library to put the all the data
    // in a form that NextJS can read and serialize
    return {
      props: {
        communityData: communityDoc.exists()
          ? JSON.parse(
              safeJsonStringify({ id: communityDoc.id, ...communityDoc.data() })
            )
          : "",
      },
    };
  } catch (error) {
    // Add error page here
    console.log("getServerSideProps error", error);
  }
}

export default CommunityPage;
