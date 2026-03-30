let selectedBlockchain = "bnb";
let provider, signer, factoryContract;
let gasPriceInterval;
let isConnected = false;
let isCorrectNetwork = false;
let currentTokenAddress = "";
let currentTokenSymbol = "";
let currentTokenDecimals = 18;
let rateLimiter = new RateLimiter();

const connectButton = document.getElementById("connectButton");
const createButton = document.getElementById("createButton");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");
const statusDiv = document.getElementById("status");
const loading = document.getElementById("loading");
const currentNetworkIndicator = document.getElementById(
  "currentNetworkIndicator",
);
const currentNetworkText = document.getElementById("currentNetworkText");
const blockchainSelect = document.getElementById("blockchainSelect");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileNav = document.getElementById("mobileNav");
const mobileNavClose = document.getElementById("mobileNavClose");
const stickyStepIndicator = document.getElementById("stickyStepIndicator");

const walletInfo = document.getElementById("walletInfo");
const walletAddressText = document.getElementById("walletAddressText");
const walletBalanceText = document.getElementById("walletBalanceText");
const balanceCheckText = document.getElementById("balanceCheckText");
const walletStatusBadge = document.getElementById("walletStatusBadge");
const walletStatusText = document.getElementById("walletStatusText");
const gasPriceGwei = document.getElementById("gasPriceGwei");

const popupOverlay = document.getElementById("popupOverlay");
const popup = document.getElementById("popup");
const popupIcon = document.getElementById("popupIcon");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupDetails = document.getElementById("popupDetails");
const popupTxHash = document.getElementById("popupTxHash");
const tokenAddressContainer = document.getElementById("tokenAddressContainer");
const tokenAddressInput = document.getElementById("tokenAddressInput");
const copyTokenAddressBtn = document.getElementById("copyTokenAddressBtn");
const addTokenToWalletBtn = document.getElementById("addTokenToWalletBtn");
const viewExplorerBtn = document.getElementById("viewExplorerBtn");
const popupActions = document.getElementById("popupActions");
const popupClose = document.getElementById("popupClose");

function showToast(message, type = "info", duration = 5000) {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createConfetti() {
  const confettiContainer = document.getElementById("confettiContainer");
  confettiContainer.innerHTML = "";

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animationDelay = `${Math.random() * 2}s`;
    confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
    confettiContainer.appendChild(confetti);

    setTimeout(() => confetti.remove(), 5000);
  }
}

function showPopup(
  type,
  title,
  message,
  txHash = null,
  tokenAddress = null,
  actions = [],
) {
  popup.className = "popup";
  popupIcon.innerHTML = "";
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popupDetails.style.display = "none";
  tokenAddressContainer.style.display = "none";
  popupActions.innerHTML = "";

  if (type === "success") {
    popup.classList.add("success");
    popupIcon.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';

    if (tokenAddress) {
      tokenAddressContainer.style.display = "block";
      tokenAddressInput.value = tokenAddress;
      currentTokenAddress = tokenAddress;
    }
  } else if (type === "error") {
    popup.classList.add("error");
    popupIcon.innerHTML =
      '<i class="fas fa-exclamation-triangle" aria-hidden="true"></i>';
  } else if (type === "pending") {
    popup.classList.add("pending");
    popupIcon.innerHTML =
      '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>';
  }

  if (txHash) {
    popupDetails.style.display = "block";
    popupTxHash.textContent = txHash;
  }

  if (type !== "pending" && actions.length > 0) {
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.className = `btn ${action.className || "btn-secondary"}`;
      button.innerHTML = action.icon
        ? `<i class="${action.icon}" aria-hidden="true"></i> ${action.text}`
        : action.text;
      button.onclick = action.onclick;
      popupActions.appendChild(button);
    });
  }

  popupOverlay.classList.add("active");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    popupClose.focus();
  }, 100);
}

function hidePopup() {
  popupOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

function copyToClipboardText(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Copied to clipboard successfully!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      showToast("Failed to copy to clipboard", "error");
    });
}

function isInAppBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /trustwallet|metamask|bitget|tokenpocket|safepal|walletconnect|dapp|web3|ethereum/i.test(
      userAgent,
    ) ||
    window.ethereum ||
    window.web3
  );
}

function handleScroll() {
  const currentScrollPosition =
    window.pageYOffset || document.documentElement.scrollTop;
  const tokenCreatorSection = document.getElementById("token-creator");

  if (
    tokenCreatorSection &&
    currentScrollPosition > tokenCreatorSection.offsetTop - 80
  ) {
    stickyStepIndicator.classList.add("visible");
  } else {
    stickyStepIndicator.classList.remove("visible");
  }
}

function initLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");

  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 100);

  setTimeout(() => {
    loadingScreen.classList.add("fade-out");
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 800);
  }, 1500);
}

function initBlockchainSelector() {
  blockchainSelect.addEventListener("change", function () {
    selectedBlockchain = this.value;

    if (this.options[this.selectedIndex].disabled) {
      showPopup(
        "warning",
        "Feature Under Development",
        "This network is currently under development. Please select another network.",
      );
      this.value = "bnb";
      selectedBlockchain = "bnb";
    }

    currentNetworkIndicator.style.display = "flex";
    currentNetworkText.textContent = `Selected: ${blockchainConfig[selectedBlockchain].chainName}`;

    if (isConnected) {
      disconnectWallet();
    }

    updateCreationFee();
    updateStepIndicator(1);
  });
}

function initTooltips() {
  const tooltipIcons = document.querySelectorAll(".tooltip-icon");
  tooltipIcons.forEach((icon) => {
    icon.addEventListener("mouseenter", (e) => {
      const tooltipText = e.target.getAttribute("data-tooltip");
      if (tooltipText) {
        showToast(tooltipText, "info", 3000);
      }
    });

    icon.addEventListener("focus", (e) => {
      const tooltipText = e.target.getAttribute("data-tooltip");
      if (tooltipText) {
        showToast(tooltipText, "info", 3000);
      }
    });
  });
}

function updateStepIndicator(stepNumber) {
  const steps = document.querySelectorAll(".step");
  steps.forEach((step, index) => {
    if (index < stepNumber) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });

  const progressBar = document.querySelector(".step-indicator");
  if (progressBar) {
    progressBar.setAttribute("aria-valuenow", stepNumber);
  }
}

function updateNetworkStatus() {
  if (!isConnected) {
    walletStatusBadge.className = "wallet-status-badge disconnected";
    walletStatusText.textContent = "Wallet Not Connected";
    connectButton.classList.add("blinking");
    connectButton.innerHTML =
      '<i class="fas fa-plug" aria-hidden="true"></i> Connect Wallet';
    switchNetworkBtn.style.display = "none";
    walletInfo.classList.remove("active");
    updateStepIndicator(1);
  } else if (!isCorrectNetwork) {
    walletStatusBadge.className = "wallet-status-badge wrong-network";
    walletStatusText.textContent = "Wrong Network";
    connectButton.classList.remove("blinking");
    connectButton.innerHTML =
      '<i class="fas fa-plug" aria-hidden="true"></i> Disconnect';
    switchNetworkBtn.style.display = "block";
    switchNetworkBtn.className = "btn btn-error";
    walletInfo.classList.remove("active");
    updateStepIndicator(1);
  } else {
    walletStatusBadge.className = "wallet-status-badge connected";
    walletStatusText.textContent = `Connected to ${blockchainConfig[selectedBlockchain].chainName}`;
    connectButton.classList.remove("blinking");
    connectButton.classList.add("btn-success");
    connectButton.innerHTML =
      '<i class="fas fa-plug" aria-hidden="true"></i> Disconnect';
    switchNetworkBtn.style.display = "none";
    walletInfo.classList.add("active");
    updateStepIndicator(2);
  }
}

async function refreshProvider() {
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    if (isConnected) {
      try {
        signer = await provider.getSigner();
        const config = blockchainConfig[selectedBlockchain];
        factoryContract = new ethers.Contract(
          config.factoryAddress,
          factoryABI,
          signer,
        );
      } catch (error) {
        console.log("Error refreshing provider:", error);
      }
    }
  }
}

async function checkNetwork() {
  if (!provider) {
    console.log("Provider not available");
    return false;
  }

  try {
    const network = await provider.getNetwork();
    const currentChainIdHex = "0x" + network.chainId.toString(16);
    const currentChainIdDecimal = network.chainId.toString();

    isCorrectNetwork =
      currentChainIdHex === blockchainConfig[selectedBlockchain].chainId ||
      currentChainIdDecimal ===
        blockchainConfig[selectedBlockchain].chainIdDecimal;

    updateNetworkStatus();

    if (isConnected && isCorrectNetwork) {
      await initializeContract();
      await updateWalletBalance();
      startGasPriceUpdates();
      updateStepIndicator(3);
    }

    return isCorrectNetwork;
  } catch (error) {
    console.error("Error checking network:", error);
    isCorrectNetwork = false;
    updateNetworkStatus();
    return false;
  }
}

async function updateWalletBalance() {
  if (!provider || !signer) return;

  try {
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const formattedBalance = ethers.formatEther(balance);

    walletAddressText.textContent = `${address.slice(0, 6)}...${address.slice(
      -4,
    )}`;

    walletBalanceText.textContent = `${parseFloat(formattedBalance).toFixed(
      4,
    )} ${blockchainConfig[selectedBlockchain].symbol}`;

    await checkBalanceSufficiency(balance);
  } catch (error) {
    console.error("Error updating wallet balance:", error);
  }
}

async function checkBalanceSufficiency(balance) {
  try {
    const creationFee = await factoryContract.creationFee();
    const totalRequired = (creationFee * 110n) / 100n;

    if (balance >= totalRequired) {
      balanceCheckText.innerHTML =
        '<span class="balance-sufficient">✓ Sufficient balance for token creation</span>';
    } else {
      balanceCheckText.innerHTML =
        '<span class="balance-insufficient">✗ Insufficient balance for token creation</span>';
    }
  } catch (error) {
    console.error("Error checking balance sufficiency:", error);
    balanceCheckText.innerHTML =
      '<span class="balance-insufficient">✗ Failed to check balance sufficiency</span>';
  }
}

async function switchToCorrectNetwork() {
  if (!window.ethereum) {
    showToast("Wallet not detected!", "error");
    return false;
  }

  try {
    const config = blockchainConfig[selectedBlockchain];
    showToast(`Switching to ${config.chainName}...`, "info");

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainId }],
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await refreshProvider();
    const networkCorrect = await checkNetwork();

    if (networkCorrect) {
      showToast(`Successfully switched to ${config.chainName}!`, "success");
      return true;
    } else {
      showToast("Failed to switch network", "warning");
      return false;
    }
  } catch (switchError) {
    console.log("Switch error:", switchError);

    if (switchError.code === 4902) {
      try {
        const config = blockchainConfig[selectedBlockchain];
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: config.chainId,
              chainName: config.chainName,
              rpcUrls: [config.rpcUrl],
              nativeCurrency: {
                name: config.nativeCurrency,
                symbol: config.nativeCurrency,
                decimals: 18,
              },
              blockExplorerUrls: [config.blockExplorer],
            },
          ],
        });

        await refreshProvider();
        await checkNetwork();
        return true;
      } catch (addError) {
        console.error("Error adding chain:", addError);
        showToast(`Failed to add ${config.chainName}`, "error");
        return false;
      }
    } else {
      console.error("Error switching chain:", switchError);
      showToast("Failed to switch network", "error");
      return false;
    }
  }
}

async function connectWallet() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  const isInApp = isInAppBrowser();

  if (isMobile && !isInApp) {
    document.getElementById("mobileModal").classList.add("active");
    return;
  }

  if (typeof window.ethereum === "undefined") {
    showToast("Please install MetaMask or another Web3 wallet!", "error");
    return;
  }

  try {
    const originalHTML = connectButton.innerHTML;
    connectButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    connectButton.disabled = true;

    showToast("Connecting to wallet...", "info");

    await refreshProvider();

    const accounts = await provider.send("eth_requestAccounts", []);
    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }

    signer = await provider.getSigner();

    isConnected = true;
    connectButton.innerHTML =
      '<i class="fas fa-plug" aria-hidden="true"></i> Disconnect';
    connectButton.onclick = disconnectWallet;

    await checkNetwork();

    if (!isCorrectNetwork) {
      showToast("Wallet connected! But wrong network.", "warning");
    } else {
      showToast("Successfully connected!", "success");
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    if (error.code === 4001) {
      showToast("Wallet connection rejected", "warning");
    } else {
      showToast("Failed to connect wallet", "error");
    }
  } finally {
    connectButton.disabled = false;
  }
}

function disconnectWallet() {
  try {
    if (window.ethereum && window.ethereum.removeListener) {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    }
  } catch (error) {
    console.log("Error removing listeners:", error);
  }

  provider = null;
  signer = null;
  factoryContract = null;
  isConnected = false;
  isCorrectNetwork = false;

  connectButton.innerHTML =
    '<i class="fas fa-plug" aria-hidden="true"></i> Connect Wallet';
  connectButton.onclick = connectWallet;
  connectButton.classList.remove("btn-success");
  connectButton.classList.add("blinking");

  walletInfo.classList.remove("active");
  walletStatusBadge.className = "wallet-status-badge disconnected";
  walletStatusText.textContent = "Wallet Not Connected";

  stopGasPriceUpdates();
  showToast("Wallet disconnected", "info");

  statusDiv.innerHTML = "";
  updateStepIndicator(1);
}

async function initializeContract() {
  try {
    const config = blockchainConfig[selectedBlockchain];
    factoryContract = new ethers.Contract(
      config.factoryAddress,
      factoryABI,
      signer,
    );
    console.log("Contract initialized successfully");

    await updateCreationFee();
  } catch (error) {
    console.error("Error initializing contract:", error);
  }
}

async function updateCreationFee() {
  try {
    const tokenCreationFee = document.getElementById("tokenCreationFee");

    if (!tokenCreationFee) return;

    let fee;
    const config = blockchainConfig[selectedBlockchain];

    if (factoryContract) {
      fee = await factoryContract.creationFee();
    } else {
      const readProvider = new ethers.JsonRpcProvider(config.rpcUrl);
      const readFactoryContract = new ethers.Contract(
        config.factoryAddress,
        factoryABI,
        readProvider,
      );
      fee = await readFactoryContract.creationFee();
    }

    const currentCreationFee = parseFloat(ethers.formatEther(fee));
    tokenCreationFee.textContent = `${currentCreationFee.toFixed(5)} ${
      config.symbol
    }`;

    updateTotalEstimate();
  } catch (error) {
    console.error("Failed to read creation fee:", error);
    const tokenCreationFee = document.getElementById("tokenCreationFee");
    if (tokenCreationFee) {
      tokenCreationFee.textContent = "Error";
    }
  }
}

async function updateGasPrice() {
  if (!provider) {
    gasPriceGwei.textContent = "-";
    return;
  }

  try {
    const feeData = await provider.getFeeData();

    if (feeData.gasPrice) {
      const currentGasPrice = parseFloat(
        ethers.formatUnits(feeData.gasPrice, "gwei"),
      );
      gasPriceGwei.textContent = `${currentGasPrice.toFixed(2)} Gwei`;

      const estimatedGasLimit = 300000;
      const gasFeeInWei = feeData.gasPrice * BigInt(estimatedGasLimit);
      const gasFeeInNative = parseFloat(ethers.formatEther(gasFeeInWei));

      const estimatedGasFee = document.getElementById("estimatedGasFee");
      if (estimatedGasFee) {
        estimatedGasFee.textContent = `${gasFeeInNative.toFixed(5)} ${
          blockchainConfig[selectedBlockchain].symbol
        }`;
      }

      updateTotalEstimate();
    } else {
      gasPriceGwei.textContent = "No Data";
    }
  } catch (error) {
    console.error("Error fetching gas price:", error);
    gasPriceGwei.textContent = "Error";
  }
}

function updateTotalEstimate() {
  const tokenCreationFee = document.getElementById("tokenCreationFee");
  const estimatedGasFee = document.getElementById("estimatedGasFee");
  const totalEstimatedFee = document.getElementById("totalEstimatedFee");

  if (!tokenCreationFee || !estimatedGasFee || !totalEstimatedFee) return;

  const creationFeeText = tokenCreationFee.textContent;
  const creationFee = creationFeeText.includes(
    blockchainConfig[selectedBlockchain].symbol,
  )
    ? parseFloat(creationFeeText.split(" ")[0])
    : 0;

  const gasFeeText = estimatedGasFee.textContent;
  const gasFee = gasFeeText.includes(
    blockchainConfig[selectedBlockchain].symbol,
  )
    ? parseFloat(gasFeeText.split(" ")[0])
    : 0;

  const total = creationFee + gasFee;
  totalEstimatedFee.textContent = `${total.toFixed(5)} ${
    blockchainConfig[selectedBlockchain].symbol
  }`;
}

function startGasPriceUpdates() {
  if (gasPriceInterval) {
    clearInterval(gasPriceInterval);
  }

  updateGasPrice();
  gasPriceInterval = setInterval(updateGasPrice, 30000);
}

function stopGasPriceUpdates() {
  if (gasPriceInterval) {
    clearInterval(gasPriceInterval);
    gasPriceInterval = null;
  }
}

async function createToken() {
  if (!factoryContract) {
    showError("Please connect your wallet first!");
    return;
  }

  if (!isCorrectNetwork) {
    showError(
      `Please switch your wallet to ${blockchainConfig[selectedBlockchain].chainName}`,
    );
    return;
  }

  try {
    const userIdentifier = await signer.getAddress();
    rateLimiter.checkLimit(userIdentifier);
  } catch (error) {
    if (error instanceof SecurityError) {
      showError(error.message);
      return;
    }
  }

  clearValidationErrors();

  try {
    const name = InputValidator.validateTokenName(
      document.getElementById("tokenName").value,
    );
    const symbol = InputValidator.validateTokenSymbol(
      document.getElementById("tokenSymbol").value,
    );
    const decimals = InputValidator.validateDecimals(
      document.getElementById("tokenDecimals").value,
    );
    const supply = InputValidator.validateSupply(
      document.getElementById("tokenSupply").value,
    );

    showLoading();
    const fee = await factoryContract.creationFee();

    const balance = await signer.provider.getBalance(await signer.getAddress());
    if (balance < fee) {
      showError(
        `Insufficient ${
          blockchainConfig[selectedBlockchain].symbol
        } balance! Required: ${ethers.formatEther(fee)} ${
          blockchainConfig[selectedBlockchain].symbol
        }`,
      );
      hideLoading();
      return;
    }

    const tx = await factoryContract.createToken(
      name,
      symbol,
      decimals,
      supply,
      { value: fee },
    );

    showTransactionPending(tx.hash);

    const receipt = await tx.wait();
    hideLoading();

    processSuccess(receipt, name, symbol, decimals, supply);
  } catch (err) {
    hideLoading();

    if (err instanceof SecurityError) {
      handleValidationError(err);
    } else {
      handleTransactionError(err);
    }
  }
}

function clearValidationErrors() {
  const errorElements = document.querySelectorAll(".error-message");
  errorElements.forEach((el) => {
    el.classList.remove("show");
    el.textContent = "";
  });

  const formControls = document.querySelectorAll(".form-control");
  formControls.forEach((control) => {
    control.classList.remove("error");
  });
}

function handleValidationError(error) {
  let fieldId = "";
  let message = error.message;

  switch (error.code) {
    case "EMPTY_NAME":
    case "INVALID_NAME":
      fieldId = "tokenName";
      break;
    case "EMPTY_SYMBOL":
    case "INVALID_SYMBOL":
      fieldId = "tokenSymbol";
      break;
    case "INVALID_DECIMALS":
    case "DECIMALS_OUT_OF_RANGE":
      fieldId = "tokenDecimals";
      break;
    case "INVALID_SUPPLY":
    case "SUPPLY_TOO_LARGE":
      fieldId = "tokenSupply";
      break;
    default:
      showError(message);
      return;
  }

  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(fieldId + "Error");

  if (field && errorElement) {
    field.classList.add("error");
    errorElement.textContent = message;
    errorElement.classList.add("show");
    field.focus();
  }
}

function showTransactionPending(txHash) {
  showPopup(
    "pending",
    "Transaction Processing",
    "Waiting for blockchain confirmation...",
    txHash,
  );
  updateStepIndicator(4);
}

function extractTokenAddress(receipt) {
  let tokenAddr = null;
  try {
    for (const log of receipt.logs) {
      try {
        const parsed = factoryContract.interface.parseLog(log);
        if (parsed && parsed.name === "TokenCreated") {
          tokenAddr = parsed.args.tokenAddress;
          break;
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    console.log("Error processing logs:", e);
  }

  if (tokenAddr && ethers.isAddress(tokenAddr)) {
    return tokenAddr;
  } else {
    console.error("Invalid token address:", tokenAddr);
    return null;
  }
}

function processSuccess(receipt, name, symbol, decimals, supply) {
  let tokenAddr = extractTokenAddress(receipt);
  const config = blockchainConfig[selectedBlockchain];

  if (!tokenAddr) {
    showPopup(
      "error",
      "Token Successfully Created",
      `Token ${name} (${symbol}) successfully created on ${config.chainName}, but token address could not be extracted. 
                Please check the transaction on the blockchain explorer.`,
    );
    return;
  }

  currentTokenAddress = tokenAddr;
  currentTokenSymbol = symbol;
  currentTokenDecimals = decimals;

  createConfetti();
  statusDiv.innerHTML = "";

  function downloadSourceCode() {
    const supplyStr = supply.toString();
    const decimalsNum = Number(decimals);

    const multiplier = 10n ** BigInt(decimalsNum);
    const initialSupplyBigInt = BigInt(supplyStr) * multiplier;

    const initialSupplyStr = initialSupplyBigInt.toString();

    const creator = walletAddressText.textContent;

    const sourceCode = `// SPDX-License-Identifier: MIT

// File: @openzeppelin/contracts@5.6.0/token/ERC20/IERC20.sol
pragma solidity >=0.4.16;
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: @openzeppelin/contracts@5.6.0/token/ERC20/extensions/IERC20Metadata.sol
pragma solidity >=0.6.2;
interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

// File: @openzeppelin/contracts@5.6.0/utils/Context.sol
pragma solidity ^0.8.20;
abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
    function _msgData() internal view virtual returns (bytes calldata) { return msg.data; }
    function _contextSuffixLength() internal view virtual returns (uint256) { return 0; }
}

// File: @openzeppelin/contracts@5.6.0/interfaces/draft-IERC6093.sol
pragma solidity >=0.8.4;
interface IERC20Errors {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

// File: @openzeppelin/contracts@5.6.0/token/ERC20/ERC20.sol
pragma solidity ^0.8.20;
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;
    mapping(address account => mapping(address spender => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    constructor(string memory name_, string memory symbol_) { _name = name_; _symbol = symbol_; }
    function name() public view virtual returns (string memory) { return _name; }
    function symbol() public view virtual returns (string memory) { return _symbol; }
    function decimals() public view virtual returns (uint8) { return 18; }
    function totalSupply() public view virtual returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view virtual returns (uint256) { return _balances[account]; }
    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }
    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }
    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }
    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) revert ERC20InvalidSender(address(0));
        if (to == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(from, to, value);
    }
    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) { _totalSupply += value; } 
        else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) revert ERC20InsufficientBalance(from, fromBalance, value);
            unchecked { _balances[from] = fromBalance - value; }
        }
        if (to == address(0)) { unchecked { _totalSupply -= value; } } 
        else { unchecked { _balances[to] += value; } }
        emit Transfer(from, to, value);
    }
    function _mint(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(address(0), account, value);
    }
    function _burn(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidSender(address(0));
        _update(account, address(0), value);
    }
    function _approve(address owner, address spender, uint256 value) internal { _approve(owner, spender, value, true); }
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) revert ERC20InvalidApprover(address(0));
        if (spender == address(0)) revert ERC20InvalidSpender(address(0));
        _allowances[owner][spender] = value;
        if (emitEvent) emit Approval(owner, spender, value);
    }
    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance < type(uint256).max) {
            if (currentAllowance < value) revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            unchecked { _approve(owner, spender, currentAllowance - value, false); }
        }
    }
}

// File: @openzeppelin/contracts@5.6.0/access/Ownable.sol
pragma solidity ^0.8.20;
abstract contract Ownable is Context {
    address private _owner;
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(initialOwner);
    }
    modifier onlyOwner() { _checkOwner(); _; }
    function owner() public view virtual returns (address) { return _owner; }
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender());
    }
    function renounceOwnership() public virtual onlyOwner { _transferOwnership(address(0)); }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: Token.sol
pragma solidity ^0.8.27;
contract Token is ERC20, Ownable {
    uint8 private _customDecimals;
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        address creator
    ) ERC20(name_, symbol_) Ownable(creator) {
        _customDecimals = decimals_;
        _mint(creator, initialSupply);
    }
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}

/*
==================================================
TOKEN DETAILS
==================================================
Network: ${config.chainName}
Token: ${name} (${symbol})
Decimals: ${decimals}
Total Supply (without decimals): ${supplyStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
Total Supply (with decimals): ${initialSupplyStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} wei
Contract Address: ${tokenAddr}
Creator: ${creator}
Transaction Hash: ${receipt.transactionHash}
==================================================
*/`;

    const blob = new Blob([sourceCode], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}_Token.sol`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast("✅ Source code downloaded!", "success");
  }

  const extraActions = [
    {
      text: "📥 Download Source Code",
      icon: "fas fa-download",
      className: "btn-primary",
      onclick: downloadSourceCode,
    },
  ];

  showPopup(
    "success",
    "Token Successfully Created! 🚀",
    `Token ${name} (${symbol}) successfully deployed on ${config.chainName}. 
        Total Supply: ${supply
          .toString()
          .replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ",",
          )} with ${decimals} decimal places.`,
    receipt.transactionHash,
    tokenAddr,
    extraActions,
  );
}

function handleTransactionError(err) {
  let userMessage = "Failed to create token";

  if (err.code === "INSUFFICIENT_FUNDS") {
    userMessage = `Insufficient ${blockchainConfig[selectedBlockchain].symbol} balance for gas fee and token creation`;
  } else if (err.code === "USER_REJECTED") {
    userMessage = "Transaction cancelled by user";
  } else if (err.message.includes("gas")) {
    userMessage = "Gas fee too high, please try again later";
  } else if (err.message.includes("network")) {
    userMessage =
      "Network issue, ensure you're connected to the correct network";
  } else if (err.message.includes("rate limit")) {
    userMessage = "Too many requests, please try again later";
  }

  showPopup("error", "Transaction Failed", `${userMessage}: ${err.message}`);
}

function showError(message) {
  showPopup("error", "Error", message);
  showToast(message, "error", 5000);
}

function showLoading() {
  showToast("Processing blockchain transaction...", "info");
  loading.style.display = "block";
  createButton.disabled = true;
  createButton.innerHTML =
    '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Processing...';
}

function hideLoading() {
  loading.style.display = "none";
  createButton.disabled = false;
  createButton.innerHTML =
    '<i class="fas fa-rocket" aria-hidden="true"></i> Deploy Cryptocurrency Token';
}

async function addTokenToWallet(tokenAddress, symbol, decimals) {
  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: tokenAddress,
          symbol: symbol,
          decimals: decimals,
        },
      },
    });
    showToast("Token successfully added to wallet!", "success");
  } catch (error) {
    console.error("Error adding token to wallet:", error);
    showToast("Failed to add token to wallet", "error");
  }
}

function setupNetworkListeners() {
  if (window.ethereum) {
    window.ethereum.on("chainChanged", async (chainId) => {
      console.log("Chain changed to:", chainId);
      await refreshProvider();
      await checkNetwork();

      if (isConnected && isCorrectNetwork) {
        showToast("Network successfully changed!", "success");
      } else if (isConnected) {
        showToast("Please switch to the correct network", "warning");
      }
    });

    window.ethereum.on("accountsChanged", async (accounts) => {
      console.log("Accounts changed:", accounts);
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (isConnected) {
        await refreshProvider();
        await checkNetwork();
        connectButton.innerHTML =
          '<i class="fas fa-plug" aria-hidden="true"></i> Disconnect';
        await updateWalletBalance();
      }
    });
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  }
}

function handleChainChanged(chainId) {
  window.location.reload();
}

function initEventListeners() {
  popupClose.onclick = hidePopup;
  popupOverlay.onclick = function (e) {
    if (e.target === popupOverlay) {
      hidePopup();
    }
  };

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && popupOverlay.classList.contains("active")) {
      hidePopup();
    }
  });

  copyTokenAddressBtn.onclick = function () {
    copyToClipboardText(currentTokenAddress);
  };

  addTokenToWalletBtn.onclick = function () {
    addTokenToWallet(
      currentTokenAddress,
      currentTokenSymbol,
      currentTokenDecimals,
    );
  };

  viewExplorerBtn.onclick = function () {
    const config = blockchainConfig[selectedBlockchain];
    window.open(
      `${config.blockExplorer}/token/${currentTokenAddress}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  mobileMenuBtn.onclick = function () {
    mobileNav.classList.add("active");
    mobileMenuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  mobileNavClose.onclick = function () {
    mobileNav.classList.remove("active");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    mobileMenuBtn.focus();
  };

  document.addEventListener("click", function (e) {
    if (
      mobileNav.classList.contains("active") &&
      !mobileNav.contains(e.target) &&
      !mobileMenuBtn.contains(e.target)
    ) {
      mobileNav.classList.remove("active");
      mobileMenuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
  });

  switchNetworkBtn.onclick = switchToCorrectNetwork;
  connectButton.onclick = connectWallet;
  createButton.onclick = createToken;

  const formInputs = document.querySelectorAll(".form-control");
  formInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      clearValidationErrors();
    });
  });

  window.addEventListener("scroll", handleScroll, { passive: true });
}

function copyUrlAndClose() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast(
      "URL copied successfully! Open in your wallet DApp Browser.",
      "success",
    );
    document.getElementById("mobileModal").classList.remove("active");
  });
}

function contactSupport() {
  const phoneNumber = "6285161111161";
  const defaultMessage =
    "Hello Token Creator Platform, I need assistance regarding crypto token creation...";
  const encodedMessage = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  showToast("Opening WhatsApp...", "info");
}

async function initApp() {
  initLoadingScreen();
  initBlockchainSelector();
  initEventListeners();
  initTooltips();
  setupNetworkListeners();

  blockchainSelect.value = "bnb";
  selectedBlockchain = "bnb";
  currentNetworkIndicator.style.display = "flex";
  currentNetworkText.textContent = `Selected: ${blockchainConfig[selectedBlockchain].chainName}`;

  await updateCreationFee();

  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        console.log("Auto-connecting to wallet...");
        await refreshProvider();
        signer = await provider.getSigner();

        connectButton.innerHTML =
          '<i class="fas fa-plug" aria-hidden="true"></i> Disconnect';
        connectButton.onclick = disconnectWallet;

        isConnected = true;
        await checkNetwork();

        if (isCorrectNetwork) {
          showToast("Wallet auto-connected!", "success");
        } else {
          showToast("Wallet connected but wrong network", "warning");
        }
      }
    } catch (error) {
      console.log("No previous wallet connection:", error);
    }
  }
}

window.addEventListener("error", function (e) {
  console.error("Global error:", e.error);
  showToast("An unexpected error occurred", "error");
});

window.addEventListener("unhandledrejection", function (e) {
  console.error("Unhandled promise rejection:", e.reason);
  showToast("An issue occurred with the operation", "error");
  e.preventDefault();
});

window.addEventListener("load", initApp);
