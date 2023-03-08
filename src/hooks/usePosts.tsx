import { Post, postState } from "@/atoms/postAtom";
import { firestore, storage } from "@/firebase/clientApp";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import React from "react";
import { useRecoilState } from "recoil";

const usePosts = () => {
  const [postsStateValue, setPostStateValue] = useRecoilState(postState);

  const onVote = async () => {};

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

  return {
    postsStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  };
};

export default usePosts;
