import { postState } from "@/atoms/postAtom";
import React from "react";
import { useRecoilState } from "recoil";

const usePosts = () => {
  const [postsStateValue, setPostStateValue] = useRecoilState(postState);

  const onVote = async () => {};

  const onSelectPost = () => {};

  const onDeletePost = async () => {};

  return {
    postsStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  };
};

export default usePosts;
