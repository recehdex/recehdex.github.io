const blockchainConfig = {
  bnb: {
    chainId: "0x38",
    chainIdDecimal: "56",
    chainName: "BNB Chain",
    rpcUrl: "https://bsc-rpc.publicnode.com",
    factoryAddress: "0xbf03140Fe24b72a1049996A7AcDa0105321e1f71",
    nativeCurrency: "BNB",
    blockExplorer: "https://bscscan.com",
    symbol: "BNB",
  },
  core: {
    chainId: "0x45C",
    chainIdDecimal: "1116",
    chainName: "Core Chain",
    rpcUrl: "https://rpc.coredao.org",
    factoryAddress: "0xa46bE644029d60108641759eB7dc656bB17A2Da9",
    nativeCurrency: "CORE",
    blockExplorer: "https://scan.coredao.org",
    symbol: "CORE",
  },
  ric: {
    chainId: "0x203BA",
    chainIdDecimal: "132026",
    chainName: "Riche Chain",
    rpcUrl: "https://seed-richechain.com",
    factoryAddress: "0xbf03140Fe24b72a1049996A7AcDa0105321e1f71",
    nativeCurrency: "RIC",
    blockExplorer: "https://richescan.com",
    symbol: "RIC",
  },
};

const factoryABI = [
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint8 decimals, uint256 totalSupply)",
  "function createToken(string memory name, string memory symbol, uint8 decimals, uint256 totalSupply) payable returns (address)",
  "function creationFee() view returns (uint256)",
  "function owner() view returns (address)",
  "function setCreationFee(uint256 _fee) external",
  "function withdraw() external",
];
