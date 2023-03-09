import { authModalState } from "@/atoms/authModalAtom";
import {
  Community,
  CommunitySnippet,
  communityState,
} from "@/atoms/communitiesAtom";
import { auth, firestore } from "@/firebase/clientApp";
import {
  collection,
  doc,
  getDocs,
  increment,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useSetRecoilState } from "recoil";

const useCommunityData = () => {
  const [user] = useAuthState(auth);
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);
  const setAuthModalState = useSetRecoilState(authModalState);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onJoinOrLeaveCommunity = (
    communityData: Community,
    isJoined: boolean
  ) => {
    // Check if user is signed in - if not then open auth modal
    if (!user) {
      // Open the modal
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    if (isJoined) {
      leaveCommunity(communityData.id);
      return;
    }

    joinCommunity(communityData);
  };

  const getMySnippets = async () => {
    setLoading(true);
    try {
      // Get users snippets
      const snippetDocs = await getDocs(
        collection(firestore, `users/${user?.uid}/communitySnippets`)
      );

      // Loop through the docs returned by firebase and then converting them into objects with the data extracted from their respective doc
      const snippets = snippetDocs.docs.map((doc) => ({ ...doc.data() }));
      setCommunityStateValue((prevState) => ({
        ...prevState,
        mySnippets: snippets as CommunitySnippet[],
      }));
    } catch (error: any) {
      console.log("Get mySnippets error", error);
      setError(error.message);
    }
    setLoading(false);
  };

  const joinCommunity = async (communityData: Community) => {
    try {
      // Create a new community snippet
      const batch = writeBatch(firestore);
      const newSnippet: CommunitySnippet = {
        communityId: communityData.id,
        imageURL: communityData.imageUrl || "",
      };

      batch.set(
        doc(
          firestore,
          `users/${user?.uid}/communitySnippets`,
          communityData.id
        ),
        newSnippet
      );

      // Updating numberOfMembers in the community
      batch.update(doc(firestore, "communities", communityData.id), {
        numberOfMembers: increment(1),
      });

      await batch.commit();

      // Update recoil state - communityState.mySnippets
      setCommunityStateValue((prevValue) => ({
        ...prevValue,
        mySnippets: [...prevValue.mySnippets, newSnippet],
      }));
    } catch (error: any) {
      console.log("This is a joinCommunity error", error);
      setError(error.message);
    }
    setLoading(false);
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      const batch = writeBatch(firestore);
      // Delete a community snippet from the user
      batch.delete(
        doc(firestore, `users/${user?.uid}/communitySnippets`, communityId)
      );
      // Updating numberOfMembers in the community by subtracting 1
      batch.update(doc(firestore, "communities", communityId), {
        numberOfMembers: increment(-1),
      });

      await batch.commit();
      // Update recoil state - communityState.mySnippets
      setCommunityStateValue((prevValue) => ({
        ...prevValue,
        mySnippets: prevValue.mySnippets.filter((community) => {
          community.communityId !== communityId;
        }),
      }));
    } catch (error: any) {
      console.log("This is a leaveCommunity error", error);
      setError(error.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setCommunityStateValue((prevValue) => ({
        ...prevValue,
        mySnippets: [],
      }));
      return;
    }
    getMySnippets();
  }, [user]);

  return {
    communityStateValue,
    onJoinOrLeaveCommunity,
    loading,
  };
};

export default useCommunityData;
