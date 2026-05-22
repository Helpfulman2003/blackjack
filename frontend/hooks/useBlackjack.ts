"use client";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BLACKJACK_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

export function useLeaderboard() {
  const { data: topPlayers, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BLACKJACK_ABI,
    functionName: "getTopPlayers",
  });
  return { topPlayers: topPlayers ?? [], refetch };
}

export function usePlayerStats(address?: `0x${string}`) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BLACKJACK_ABI,
    functionName: "getPlayerStats",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  return data;
}

export function useSubmitResult() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const submit = (
    wins: number,
    losses: number,
    pushes: number,
    biggestWin: number,
    nickname: string
  ) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: BLACKJACK_ABI,
      functionName: "submitResult",
      args: [BigInt(wins), BigInt(losses), BigInt(pushes), BigInt(biggestWin), nickname],
    });
  };

  return { submit, isPending, isConfirming, isSuccess, error, hash };
}
