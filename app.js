// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Arc Testnet USDC Address
const ARC_CHAIN_ID = '0x4cef52'; // Arc Network Testnet Hex ID
const INR_RATE = 83.50; // Mock Conversion Rate

let userAddress = "", provider, signer;

// 1. MANUAL CONNECTION LOGIC
async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install OKX or MetaMask wallet!");
        return;
    }
    try {
        // Request Account Access
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Check if on correct Chain (Arc Testnet)
        const network = await provider.getNetwork();
        if (ethers.utils.hexValue(network.chainId) !== ARC_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ARC_CHAIN_ID }],
                });
                location.reload();
            } catch (switchError) {
                alert("Please add Arc Network Testnet to your wallet!");
            }
        }

        // Update UI to Connected State
        updateUI(true);
        fetchBalance();
        
    } catch (error) {
        console.error("User rejected the request", error);
    }
}

// 2. TOGGLE PROFILE (Connect or Open Menu)
function toggleProfile() {
    if (!userAddress || userAddress === "") {
        connectWallet();
    } else {
        const menu = document.getElementById("profileMenu");
        if (menu) menu.classList.toggle("show");
    }
}

// 3. UI UPDATE HELPER
function updateUI(isConnected) {
    const dot = document.getElementById("dot");
    const label = document.getElementById("walletLabel");

    if (isConnected) {
        dot.classList.replace("bg-red-500", "bg-green-500");
        dot.classList.remove("animate-pulse");
        label.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
    } else {
        dot.classList.replace("bg-green-500", "bg-red-500");
        dot.classList.add("animate-pulse");
        label.innerText = "Connect Wallet";
    }
}

// 4. DISCONNECT LOGIC
function disconnectWallet() {
    userAddress = "";
    signer = null;

    updateUI(false);
    
    // Close dropdown
    document.getElementById("profileMenu").classList.remove("show");

    // Reset Balances
    document.getElementById("usdcBal").innerText = "0.00";
    document.getElementById("inrBal").innerText = "0.00";

    alert("Disconnected Successfully!");
}

// 5. FETCH BALANCE LOGIC
async function fetchBalance() {
    if (!userAddress) return;
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const balance = await contract.balanceOf(userAddress);
        
        // USDC usually has 6 decimals
        const formattedBal = ethers.utils.formatUnits(balance, 6);
        
        document.getElementById("usdcBal").innerText = parseFloat(formattedBal).toFixed(2);
        document.getElementById("inrBal").innerText = (formattedBal * INR_RATE).toLocaleString('en-IN', {
            maximumFractionDigits: 2
        });
    } catch (error) {
        console.error("Balance fetch error:", error);
    }
}

// 6. UTILITY FUNCTIONS
function copyAddr() {
    if (userAddress) {
        navigator.clipboard.writeText(userAddress);
        alert("Address Copied!");
        document.getElementById("profileMenu").classList.remove("show");
    }
}

// Close dropdown on click outside
window.onclick = function(event) {
    if (!event.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    }
}

// 7. DASHBOARD TOOLS (Placeholder Logic)
function actionAlert(type) {
    if (!userAddress) {
        alert("Pehle Wallet Connect karo!");
        connectWallet();
    } else {
        alert(type + " functionality coming soon on Arc Network!");
    }
}
