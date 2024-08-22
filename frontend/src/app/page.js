"use client";
import { useEffect, useState } from "react";
import { Web3 } from "web3";

const nodeUrl = process.env.NEXT_PUBLIC_NODE_URL;
const chainId = "0xA045C"; // 656476 Chain ID for Open campus

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

const contractAbi = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "candidates",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "voteCount", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "candidatesCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCandidate",
    inputs: [
      { name: "_candidateId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "voteCount", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      { name: "_candidateId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "voters",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CandidateAdded",
    inputs: [
      {
        name: "candidateId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      { name: "name", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Voted",
    inputs: [
      {
        name: "voter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "candidateId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
];

export default function Home() {
  const [candidates, setCandidates] = useState([]);
  const [account, setAccount] = useState("");
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    if (isCorrectNetwork) {
      loadCandidates();
    }
  }, [isCorrectNetwork]);

  const checkNetwork = async (web3) => {
    // Get the current chain ID
    const currentChainId = await web3.eth.getChainId();
    // Check if the user is connected to the correct network
    if (currentChainId !== parseInt(chainId, 16)) {
      // Switch to the correct network if not
      await switchNetwork();
    } else {
      setIsCorrectNetwork(true);
    }
  };

  const switchNetwork = async () => {
    try {
      // Request to switch the network in MetaMask
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainId }],
      });
      setIsCorrectNetwork(true);
    } catch (switchError) {
      // Handle the error if the network is not available in MetaMask
      if (switchError.code === 4902) {
        setError(
          "This network is not available in your MetaMask, please add it manually"
        );
      }
    }
  };

  const loadAccount = async () => {
    if (window.ethereum) {
      // const web3 = new Web3(window.ethereum);

      const Web3 =
        typeof window !== "undefined" ? require("web3").default : undefined;
      try {
        // Request the user's accounts from MetaMask
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await Web3.eth.getAccounts();
        // Set the user's account
        setAccount(accounts[0]);
        // Check if the user is connected to the correct network
        await checkNetwork(web3);
        return accounts[0];
      } catch (error) {
        // Handle the error if the user denies account access
        setError("User denied account access");
        return null;
      }
    } else {
      // Handle the error if MetaMask is not detected
      setError("MetaMask not detected");
      return null;
    }
  };

  const disconnectAccount = () => {
    // Reset the user's account and network status
    setAccount("");
    setIsCorrectNetwork(false);
  };

  const loadCandidates = async () => {
    const web3 = new Web3(nodeUrl);
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    // Get the total number of candidates from the smart contract
    const candidatesCount = await contract.methods.candidatesCount().call();

    const candidatesArray = [];
    // Fetch each candidate's details from the smart contract
    for (let i = 1; i <= candidatesCount; i++) {
      const candidate = await contract.methods.getCandidate(i).call();
      candidatesArray.push({
        id: i,
        name: candidate[0],
        voteCount: parseInt(candidate[1], 10),
      });
    }
    // Update the state with the list of candidates
    setCandidates(candidatesArray);
    setLoading(false);
  };

  const vote = async (candidateId) => {
    // Load the user's account if not already loaded
    const account = await loadAccount();
    if (!account) return;

    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(contractAbi, contractAddress);

    try {
      // Call the vote function in the smart contract
      await contract.methods.vote(candidateId).send({ from: account });
      // Reload the candidates to update the vote counts
      loadCandidates();
    } catch (error) {
      // Handle the error if voting fails
      setError("Error voting: " + error.message);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Edu-Chain Voting App</h1>
      <h2 className="text-l font-bold mb-4">
        Connect your account and vote for your candidate!
      </h2>
      <h2 className="text-l font-bold mb-4">
        Each account can only vote once.
      </h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {!account ? (
        <div className="mb-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={loadAccount}
          >
            Login with MetaMask
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <span className="text-lg mr-4">Connected: {account}</span>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={disconnectAccount}
            >
              Log out
            </button>
          </div>
          {isCorrectNetwork ? (
            loading ? (
              <div>Loading candidates...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 border rounded shadow">
                    <span className="text-lg text-white">
                      {candidate.name}: {candidate.voteCount} votes
                    </span>
                    <button
                      className="ml-4 bg-blue-500 text-white px-4 py-2 rounded"
                      onClick={() => vote(candidate.id)}
                    >
                      Vote
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-red-500">
              Please switch to the Edu chain Testnet to vote.
            </div>
          )}
        </>
      )}
    </div>
  );
}
