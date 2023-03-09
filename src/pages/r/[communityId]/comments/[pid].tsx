import { Post } from "@/atoms/postAtom";
import About from "@/components/Community/About";
import PageContent from "@/components/Layout/PageContent";
import PostItem from "@/components/Posts/PostItem";
import { auth, firestore } from "@/firebase/clientApp";
import useCommunityData from "@/hooks/useCommunityData";
import usePosts from "@/hooks/usePosts";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";

const PostPage: React.FC = () => {
  const { postsStateValue, setPostStateValue, onDeletePost, onVote } =
    usePosts();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { communityStateValue } = useCommunityData();

  // When users are coming to an individual post not directly from the community page then we will query the db and get the post
  const fetchPost = async (postId: string) => {
    try {
      const postDocRef = doc(firestore, "posts", postId);
      const postDoc = await getDoc(postDocRef);
      setPostStateValue((prevValue) => ({
        ...prevValue,
        selectedPost: { id: postDoc.id, ...postDoc.data() } as Post,
      }));
    } catch (error) {
      console.log("fetchPost error", error);
    }
  };

  // fetchPost will only run when a user comes directly to a post (versus routing there from the applicable community) - this will run each time a postId and new selectedPost value is generated
  useEffect(() => {
    const { pid } = router.query;

    if (pid && !postsStateValue.selectedPost) {
      fetchPost(pid as string);
    }
  }, [router.query, postsStateValue.selectedPost]);

  return (
    <PageContent>
      <>
        {postsStateValue.selectedPost && (
          <PostItem
            post={postsStateValue.selectedPost}
            onVote={onVote}
            onDeletePost={onDeletePost}
            userVoteValue={
              postsStateValue.postVotes.find(
                (item) => item.postId === postsStateValue.selectedPost?.id
              )?.voteValue
            }
            userIsCreator={
              user?.uid === postsStateValue.selectedPost?.creatorId
            }
          />
        )}
        {/* Comments */}
      </>
      <>
        {communityStateValue.currentCommunity && (
          <About communityData={communityStateValue.currentCommunity} />
        )}
      </>
    </PageContent>
  );
};

export default PostPage;
