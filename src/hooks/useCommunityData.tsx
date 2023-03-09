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
  getDoc,
  getDocs,
  increment,
  writeBatch,
} from "firebase/firestore";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useSetRecoilState } from "recoil";

const useCommunityData = () => {
  const [user] = useAuthState(auth);
  const router = useRouter();
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

  const getCommunityData = async (communityId: string) => {
    try {
      const communityDocRef = doc(firestore, "communities", communityId);
      const communityDoc = await getDoc(communityDocRef);

      setCommunityStateValue((prevValue) => ({
        ...prevValue,
        currentCommunity: {
          id: communityDoc.id,
          ...communityDoc.data(),
        } as Community,
      }));
    } catch (error) {
      console.log("this is a getCommunityData error", error);
    }
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

  useEffect(() => {
    const { communityId } = router.query;

    if (communityId && !communityStateValue.currentCommunity) {
      getCommunityData(communityId as string);
    }
  }, [router.query, communityStateValue.currentCommunity]);

  return {
    communityStateValue,
    onJoinOrLeaveCommunity,
    loading,
  };
};

export default useCommunityData;
