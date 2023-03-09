import { authModalState } from "@/atoms/authModalAtom";
import { communityState } from "@/atoms/communitiesAtom";
import { Post, postState, PostVote } from "@/atoms/postAtom";
import { auth, firestore, storage } from "@/firebase/clientApp";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import React, { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

const usePosts = () => {
  const [user] = useAuthState(auth);
  const [postsStateValue, setPostStateValue] = useRecoilState(postState);
  const currentCommunity = useRecoilValue(communityState).currentCommunity;
  const setAuthModalState = useSetRecoilState(authModalState);

  const onVote = async (post: Post, vote: number, communityId: string) => {
    // Check for authenticated user - if not a user, then open auth modal
    if (!user?.uid) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    try {
      const { voteStatus } = post;
      const existingVote = postsStateValue.postVotes.find(
        (vote) => vote.postId === post.id
      );

      const batch = writeBatch(firestore);
      // Create copies of current state values to be modified and then update state with the modified copies - ensures avoiding mutating state directly
      const updatedPost = { ...post };
      const updatedPosts = [...postsStateValue.posts];
      let updatedPostVotes = [...postsStateValue.postVotes];

      let voteChange = vote;

      // New vote
      if (!existingVote) {
        // Create a new postVote document on users postVote subcollection
        const postVoteRef = doc(
          collection(firestore, "users", `${user?.uid}/postVotes`)
        );

        const newVote: PostVote = {
          id: postVoteRef.id,
          postId: post.id!, // ! to tell TS that this will be a defined value inside of this function
          communityId,
          voteValue: vote, // 1 or -1
        };

        batch.set(postVoteRef, newVote);

        // Add or subtract 1 to/from post.voteStatus
        updatedPost.voteStatus = voteStatus + vote;
        updatedPostVotes = [...updatedPostVotes, newVote];
      }
      // There is already an existing vote (up or down)
      else {
        const postVoteRef = doc(
          firestore,
          "users",
          `${user?.uid}/postVotes/${existingVote.id}`
        );

        // Removing the vote (up to neutral or down to neutral)
        if (existingVote.voteValue === vote) {
          // Add or subtract 1 to/from post.voteStatus
          updatedPost.voteStatus = voteStatus - vote;
          updatedPostVotes = updatedPostVotes.filter(
            (vote) => vote.id !== existingVote.id
          );

          // Delete the postVote document
          batch.delete(postVoteRef);

          voteChange *= -1;
        }

        // Flipping vote (up to down or down to up)
        else {
          // Add or subtract 2 to/from post.voteStatus
          updatedPost.voteStatus = voteStatus + 2 * vote;

          const voteIndex = postsStateValue.postVotes.findIndex(
            (vote) => vote.id === existingVote.id
          );

          updatedPostVotes[voteIndex] = {
            ...existingVote,
            voteValue: vote,
          };

          // Updating the existing postVote document
          batch.update(postVoteRef, {
            voteValue: vote,
          });

          voteChange = 2 * vote;
        }
      }

      // Update post document in db
      const postRef = doc(firestore, "posts", post.id!);
      batch.update(postRef, { voteStatus: voteStatus + voteChange });

      await batch.commit(); // Write the updates to the db

      // Update state with updated values
      const postIndex = postsStateValue.posts.findIndex(
        (item) => item.id === post.id
      );
      updatedPosts[postIndex] = updatedPost;

      setPostStateValue((prevValue) => ({
        ...prevValue,
        posts: updatedPosts,
        postVotes: updatedPostVotes,
      }));
    } catch (error) {
      console.log("onVote error", error);
    }
  };

  const onSelectPost = () => {};

  const onDeletePost = async (post: Post): Promise<boolean> => {
    try {
      // Check if post that is trying to be deleted has an image attached to the post and if it does then it is removed from the firebase storage
      if (post.imageURL) {
        const imageRef = ref(storage, `posts/${post.id}/image`);
        await deleteObject(imageRef);
      }

      // Then delete the actual post document itself in the firestore db
      // When deleting a post we know that it will have an id, so the ! operator is telling TS it is okay to proceed
      const postDocRef = doc(firestore, "posts", post.id!);
      await deleteDoc(postDocRef);

      // Update recoilState so there is no deleted post on the UI
      setPostStateValue((prevValue) => ({
        ...prevValue,
        posts: prevValue.posts.filter((item) => item.id !== post.id),
      }));

      return true;
    } catch (error) {
      return false;
    }
  };

  const getCommunityPostVotes = async (communityId: string) => {
    const postVotesQuery = query(
      collection(firestore, "users", `${user?.uid}/postVotes`),
      where("communityId", "==", communityId)
    );

    const postVoteDocs = await getDocs(postVotesQuery); // Returns an array of all the postVotes docs
    const postVotes = postVoteDocs.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setPostStateValue((prevValue) => ({
      ...prevValue,
      postVotes: postVotes as PostVote[],
    }));
  };

  // Run the getCommunityPostVotes function whenever a user lands on a commnuity page
  useEffect(() => {
    if (!user || !currentCommunity?.id) return;
    getCommunityPostVotes(currentCommunity?.id);
  }, [user, currentCommunity]);

  // If there is no user/you logout, this will clear the up/downvotes that you made on a post
  useEffect(() => {
    if (!user) {
      setPostStateValue((prevValue) => ({
        ...prevValue,
        postVotes: [],
      }));
    }
  }, [user]);

  return {
    postsStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  };
};

export default usePosts;
